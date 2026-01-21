"""
신고/경고/정지 시스템 라우터

유저 신고 접수, 관리자 처리, 경고 발급, 정지 관리
Supabase (PostgreSQL) 사용
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from supabase import Client
import uuid

from ..models import (
    ReportCreate, ReportResponse, ReportListResponse, ReportAction,
    ReportCategory, ReportStatus, ReportTargetType,
    WarningResponse, UserWarningStatus, MessageResponse, UserResponse
)
from ..dependencies import get_current_user, get_supabase_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reports"])


# ============================================
# 악의적 신고자 감지 설정
# ============================================

REPORT_ABUSE_SETTINGS = {
    "max_reports_per_hour": 10,
    "max_reports_per_day": 30,
    "dismissed_threshold": 0.7,
    "min_reports_for_threshold": 5,
    "target_concentration_limit": 3,
}


async def check_reporter_abuse(db: Client, reporter_id: str) -> dict:
    """신고자의 신고 남용 여부 체크"""
    now = datetime.now()
    one_hour_ago = (now - timedelta(hours=1)).isoformat()
    one_day_ago = (now - timedelta(days=1)).isoformat()

    # 신고자의 모든 신고 조회
    result = db.table("reports").select("*").eq("reporter_id", reporter_id).execute()
    all_reports = result.data or []

    # 통계 계산
    total_reports = len(all_reports)
    reports_last_hour = 0
    reports_last_day = 0
    dismissed_count = 0
    resolved_count = 0
    target_counts = {}

    for data in all_reports:
        created_at = data.get("created_at")
        report_status = data.get("status")
        target_author = data.get("target_author_id")

        if created_at:
            if created_at > one_hour_ago:
                reports_last_hour += 1
            if created_at > one_day_ago:
                reports_last_day += 1
                if target_author:
                    target_counts[target_author] = target_counts.get(target_author, 0) + 1

        if report_status == "dismissed":
            dismissed_count += 1
        elif report_status in ["resolved", "dismissed"]:
            resolved_count += 1

    stats = {
        "total_reports": total_reports,
        "reports_last_hour": reports_last_hour,
        "reports_last_day": reports_last_day,
        "dismissed_count": dismissed_count,
        "resolved_count": resolved_count,
        "dismissed_rate": dismissed_count / resolved_count if resolved_count > 0 else 0,
    }

    settings = REPORT_ABUSE_SETTINGS

    # 1. 시간당 신고 초과
    if reports_last_hour >= settings["max_reports_per_hour"]:
        return {
            "is_abusive": True,
            "reason": f"시간당 신고 한도 초과 ({reports_last_hour}/{settings['max_reports_per_hour']})",
            "abuse_type": "rate_limit",
            "stats": stats
        }

    # 2. 일일 신고 초과
    if reports_last_day >= settings["max_reports_per_day"]:
        return {
            "is_abusive": True,
            "reason": f"일일 신고 한도 초과 ({reports_last_day}/{settings['max_reports_per_day']})",
            "abuse_type": "rate_limit",
            "stats": stats
        }

    # 3. 높은 기각률
    if resolved_count >= settings["min_reports_for_threshold"]:
        dismissed_rate = dismissed_count / resolved_count
        if dismissed_rate >= settings["dismissed_threshold"]:
            return {
                "is_abusive": True,
                "reason": f"신고 기각률이 높습니다 ({dismissed_rate:.0%})",
                "abuse_type": "high_dismissal",
                "stats": stats
            }

    # 4. 특정 유저 집중 신고
    for target_id, count in target_counts.items():
        if count >= settings["target_concentration_limit"]:
            return {
                "is_abusive": True,
                "reason": f"같은 유저를 24시간 내 {count}회 신고했습니다.",
                "abuse_type": "targeting",
                "stats": stats
            }

    return {"is_abusive": False, "reason": None, "stats": stats}


# ============================================
# 1. 신고 생성 (Create Report)
# ============================================

@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_report(
    report_data: ReportCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> ReportResponse:
    """콘텐츠 또는 유저 신고"""
    try:
        logger.info(f"🚨 신고 생성: {current_user.username} → {report_data.target_type}:{report_data.target_id}")

        # 악의적 신고자 체크
        abuse_check = await check_reporter_abuse(db, current_user.uid)
        if abuse_check["is_abusive"]:
            logger.warning(f"⚠️ 악의적 신고 감지: {current_user.uid} - {abuse_check['reason']}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": abuse_check["reason"],
                    "error_code": "REPORT_ABUSE_DETECTED",
                    "abuse_type": abuse_check.get("abuse_type"),
                }
            )

        # 자기 자신 신고 방지
        target_author_id = None
        
        if report_data.target_type == ReportTargetType.USER:
            if report_data.target_id == current_user.uid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="자기 자신을 신고할 수 없습니다."
                )
            target_author_id = report_data.target_id
            
        elif report_data.target_type == ReportTargetType.POST:
            result = db.table("posts").select("author_id").eq("post_id", report_data.target_id).execute()
            if result.data:
                target_author_id = result.data[0].get("author_id")
                if target_author_id == current_user.uid:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="자신의 게시글을 신고할 수 없습니다."
                    )
                    
        elif report_data.target_type == ReportTargetType.COMMENT:
            result = db.table("comments").select("author_id").eq("comment_id", report_data.target_id).execute()
            if result.data:
                target_author_id = result.data[0].get("author_id")
                if target_author_id == current_user.uid:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="자신의 댓글을 신고할 수 없습니다."
                    )

        # 신고 ID 생성
        report_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()

        report_doc = {
            "report_id": report_id,
            "reporter_id": current_user.uid,
            "reporter_username": current_user.username,
            "target_type": report_data.target_type.value,
            "target_id": report_data.target_id,
            "target_author_id": target_author_id,
            "category": report_data.category.value,
            "reason": report_data.reason,
            "status": "pending",
            "admin_note": None,
            "created_at": now,
            "resolved_at": None
        }

        db.table("reports").insert(report_doc).execute()
        
        logger.info(f"✅ 신고 생성 완료: {report_id}")

        return ReportResponse(
            report_id=report_id,
            reporter_id=current_user.uid,
            reporter_username=current_user.username,
            target_type=report_data.target_type,
            target_id=report_data.target_id,
            target_author_id=target_author_id,
            category=report_data.category,
            reason=report_data.reason,
            status=ReportStatus.PENDING,
            created_at=now
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 신고 생성 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report"
        )


# ============================================
# 2. 내 신고 내역 조회
# ============================================

@router.get(
    "/my",
    response_model=ReportListResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> ReportListResponse:
    """내가 신고한 내역 조회"""
    try:
        logger.info(f"📖 내 신고 내역 조회: {current_user.uid}")

        offset = (page - 1) * page_size
        
        result = db.table("reports").select("*", count="exact").eq(
            "reporter_id", current_user.uid
        ).order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

        total_count = result.count if result.count else 0

        reports = []
        for data in result.data:
            reports.append(ReportResponse(
                report_id=data.get("report_id"),
                reporter_id=data.get("reporter_id"),
                reporter_username=data.get("reporter_username"),
                target_type=ReportTargetType(data.get("target_type")),
                target_id=data.get("target_id"),
                target_author_id=data.get("target_author_id"),
                category=ReportCategory(data.get("category")),
                reason=data.get("reason"),
                status=ReportStatus(data.get("status")),
                admin_note=data.get("admin_note"),
                created_at=data.get("created_at"),
                resolved_at=data.get("resolved_at")
            ))

        return ReportListResponse(
            reports=reports,
            total_count=total_count,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        logger.error(f"❌ 신고 내역 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reports"
        )


# ============================================
# 3. 관리자: 신고 목록 조회
# ============================================

@router.get(
    "/admin",
    response_model=ReportListResponse,
    status_code=status.HTTP_200_OK
)
async def get_all_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> ReportListResponse:
    """관리자용 전체 신고 목록 조회"""
    try:
        # 관리자 권한 확인 (TODO: 실제 관리자 체크 추가)
        logger.info(f"📖 관리자 신고 목록 조회: {current_user.uid}")

        offset = (page - 1) * page_size
        
        query = db.table("reports").select("*", count="exact")
        
        if status_filter:
            query = query.eq("status", status_filter)
        
        result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

        total_count = result.count if result.count else 0

        reports = []
        for data in result.data:
            reports.append(ReportResponse(
                report_id=data.get("report_id"),
                reporter_id=data.get("reporter_id"),
                reporter_username=data.get("reporter_username"),
                target_type=ReportTargetType(data.get("target_type")),
                target_id=data.get("target_id"),
                target_author_id=data.get("target_author_id"),
                category=ReportCategory(data.get("category")),
                reason=data.get("reason"),
                status=ReportStatus(data.get("status")),
                admin_note=data.get("admin_note"),
                created_at=data.get("created_at"),
                resolved_at=data.get("resolved_at")
            ))

        return ReportListResponse(
            reports=reports,
            total_count=total_count,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        logger.error(f"❌ 관리자 신고 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reports"
        )


# ============================================
# 4. 관리자: 신고 처리
# ============================================

@router.put(
    "/{report_id}/action",
    response_model=ReportResponse,
    status_code=status.HTTP_200_OK
)
async def process_report(
    report_id: str,
    action: ReportAction,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> ReportResponse:
    """관리자가 신고 처리"""
    try:
        logger.info(f"⚖️ 신고 처리: {report_id} → {action.status}")

        # 신고 조회
        result = db.table("reports").select("*").eq("report_id", report_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        report = result.data[0]
        now = datetime.now().isoformat()

        # 신고 상태 업데이트
        update_data = {
            "status": action.status.value,
            "admin_note": action.admin_note,
            "resolved_at": now if action.status in [ReportStatus.RESOLVED, ReportStatus.DISMISSED] else None
        }
        
        db.table("reports").update(update_data).eq("report_id", report_id).execute()

        # 경고 발급
        if action.issue_warning and report.get("target_author_id"):
            warning_id = str(uuid.uuid4())[:8]
            
            # 대상 유저 정보 조회
            user_result = db.table("users").select("username").eq("uid", report.get("target_author_id")).execute()
            username = user_result.data[0].get("username") if user_result.data else "Unknown"
            
            warning_doc = {
                "warning_id": warning_id,
                "user_id": report.get("target_author_id"),
                "username": username,
                "reason": action.admin_note or report.get("reason"),
                "severity": action.warning_severity or 1,
                "related_report_id": report_id,
                "issued_by": current_user.uid,
                "created_at": now,
                "expires_at": (datetime.now() + timedelta(days=90)).isoformat()
            }
            db.table("warnings").insert(warning_doc).execute()
            
            # 유저의 warning_count 증가
            db.table("users").update({
                "warning_count": user_result.data[0].get("warning_count", 0) + 1 if user_result.data else 1
            }).eq("uid", report.get("target_author_id")).execute()
            
            logger.info(f"⚠️ 경고 발급: {report.get('target_author_id')} (severity: {action.warning_severity})")

        # 콘텐츠 삭제
        if action.delete_content:
            if report.get("target_type") == "post":
                db.table("posts").update({"is_deleted": True}).eq("post_id", report.get("target_id")).execute()
            elif report.get("target_type") == "comment":
                db.table("comments").update({"is_deleted": True}).eq("comment_id", report.get("target_id")).execute()
            
            logger.info(f"🗑️ 콘텐츠 삭제: {report.get('target_type')}:{report.get('target_id')}")

        logger.info(f"✅ 신고 처리 완료: {report_id}")

        return ReportResponse(
            report_id=report_id,
            reporter_id=report.get("reporter_id"),
            reporter_username=report.get("reporter_username"),
            target_type=ReportTargetType(report.get("target_type")),
            target_id=report.get("target_id"),
            target_author_id=report.get("target_author_id"),
            category=ReportCategory(report.get("category")),
            reason=report.get("reason"),
            status=action.status,
            admin_note=action.admin_note,
            created_at=report.get("created_at"),
            resolved_at=now
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 신고 처리 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process report"
        )


# ============================================
# 5. 유저 경고 현황 조회
# ============================================

@router.get(
    "/warnings/{user_id}",
    response_model=UserWarningStatus,
    status_code=status.HTTP_200_OK
)
async def get_user_warnings(
    user_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> UserWarningStatus:
    """유저의 경고 현황 조회"""
    try:
        logger.info(f"⚠️ 경고 현황 조회: {user_id}")

        # 유저 정보 조회
        user_result = db.table("users").select("*").eq("uid", user_id).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = user_result.data[0]

        # 경고 목록 조회
        warnings_result = db.table("warnings").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()

        now = datetime.now().isoformat()
        active_warnings = []
        
        for w in warnings_result.data:
            expires_at = w.get("expires_at")
            if expires_at and expires_at > now:
                active_warnings.append(WarningResponse(
                    warning_id=w.get("warning_id"),
                    user_id=w.get("user_id"),
                    username=w.get("username"),
                    reason=w.get("reason"),
                    severity=w.get("severity"),
                    related_report_id=w.get("related_report_id"),
                    issued_by=w.get("issued_by"),
                    created_at=w.get("created_at"),
                    expires_at=w.get("expires_at")
                ))

        return UserWarningStatus(
            user_id=user_id,
            username=user_data.get("username"),
            total_warnings=len(warnings_result.data),
            active_warnings=len(active_warnings),
            is_banned=user_data.get("is_suspended", False),
            ban_expires_at=user_data.get("ban_expires_at"),
            warnings=active_warnings
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 경고 현황 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch warnings"
        )


# ============================================
# 6. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def reports_health():
    """Reports 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "reports",
        "database": "supabase",
        "timestamp": datetime.now().isoformat()
    }
