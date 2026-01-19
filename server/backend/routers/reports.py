"""
신고/경고/정지 시스템 라우터

유저 신고 접수, 관리자 처리, 경고 발급, 정지 관리
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from firebase_admin import firestore
import uuid

from ..models import (
    ReportCreate, ReportResponse, ReportListResponse, ReportAction,
    ReportCategory, ReportStatus, ReportTargetType,
    WarningResponse, UserWarningStatus, MessageResponse, UserResponse
)
from ..dependencies import get_current_user, get_firestore_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reports"])


# ============================================
# 악의적 신고자 감지 설정
# ============================================

# 신고 남용 기준
REPORT_ABUSE_SETTINGS = {
    "max_reports_per_hour": 10,       # 시간당 최대 신고 수
    "max_reports_per_day": 30,        # 일일 최대 신고 수
    "dismissed_threshold": 0.7,        # 기각률 70% 이상이면 남용으로 판단
    "min_reports_for_threshold": 5,    # 최소 5건 이상 신고해야 기각률 계산
    "target_concentration_limit": 3,   # 같은 유저 집중 신고 제한 (24시간 내)
}


async def check_reporter_abuse(db: firestore.client, reporter_id: str) -> dict:
    """
    신고자의 신고 남용 여부 체크

    Returns:
        {
            "is_abusive": bool,
            "reason": str or None,
            "stats": dict
        }
    """
    now = datetime.now()
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(days=1)

    # 신고자의 모든 신고 조회
    all_reports = list(
        db.collection("reports")
        .where("reporter_id", "==", reporter_id)
        .stream()
    )

    # 통계 계산
    total_reports = len(all_reports)
    reports_last_hour = 0
    reports_last_day = 0
    dismissed_count = 0
    resolved_count = 0
    target_counts = {}  # 대상별 신고 횟수

    for doc in all_reports:
        data = doc.to_dict()
        created_at = data.get("created_at")
        status = data.get("status")
        target_author = data.get("target_author_id")

        # 시간대별 카운트
        if created_at:
            if created_at > one_hour_ago:
                reports_last_hour += 1
            if created_at > one_day_ago:
                reports_last_day += 1
                # 24시간 내 같은 대상 신고 카운트
                if target_author:
                    target_counts[target_author] = target_counts.get(target_author, 0) + 1

        # 상태별 카운트
        if status == "dismissed":
            dismissed_count += 1
        elif status in ["resolved", "dismissed"]:
            resolved_count += 1

    stats = {
        "total_reports": total_reports,
        "reports_last_hour": reports_last_hour,
        "reports_last_day": reports_last_day,
        "dismissed_count": dismissed_count,
        "resolved_count": resolved_count,
        "dismissed_rate": dismissed_count / resolved_count if resolved_count > 0 else 0,
    }

    # 남용 판단
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

    # 3. 높은 기각률 (충분한 샘플이 있을 때만)
    if resolved_count >= settings["min_reports_for_threshold"]:
        dismissed_rate = dismissed_count / resolved_count
        if dismissed_rate >= settings["dismissed_threshold"]:
            return {
                "is_abusive": True,
                "reason": f"신고 기각률이 높습니다 ({dismissed_rate:.0%}). 신고 기능 남용으로 판단됩니다.",
                "abuse_type": "high_dismissal",
                "stats": stats
            }

    # 4. 특정 유저 집중 신고
    for target_id, count in target_counts.items():
        if count >= settings["target_concentration_limit"]:
            return {
                "is_abusive": True,
                "reason": f"같은 유저를 24시간 내 {count}회 신고했습니다. 괴롭힘으로 판단될 수 있습니다.",
                "abuse_type": "targeting",
                "stats": stats
            }

    return {
        "is_abusive": False,
        "reason": None,
        "stats": stats
    }


async def record_reporter_abuse(
    db: firestore.client,
    reporter_id: str,
    abuse_type: str,
    reason: str
):
    """
    악의적 신고자 기록 및 경고 발급
    """
    now = datetime.now()

    # 신고 남용 기록
    abuse_id = str(uuid.uuid4())[:8]
    abuse_doc = {
        "abuse_id": abuse_id,
        "reporter_id": reporter_id,
        "abuse_type": abuse_type,
        "reason": reason,
        "created_at": now,
    }
    db.collection("report_abuses").document(abuse_id).set(abuse_doc)

    # 누적 남용 횟수 확인
    abuse_count = len(list(
        db.collection("report_abuses")
        .where("reporter_id", "==", reporter_id)
        .stream()
    ))

    # 3회 이상 남용 시 경고 발급
    if abuse_count >= 3:
        # 유저 정보 조회
        user_doc = db.collection("users").document(reporter_id).get()
        username = "Unknown"
        if user_doc.exists:
            username = user_doc.to_dict().get("username", "Unknown")

        warning_id = str(uuid.uuid4())[:8]
        warning_doc = {
            "warning_id": warning_id,
            "user_id": reporter_id,
            "username": username,
            "reason": f"신고 기능 남용 ({abuse_count}회 적발): {reason}",
            "severity": min(abuse_count - 2, 3),  # 3회: 1, 4회: 2, 5회+: 3
            "related_report_id": None,
            "issued_by": "system",
            "created_at": now,
            "expires_at": now + timedelta(days=90),
        }
        db.collection("warnings").document(warning_id).set(warning_doc)
        logger.warning(f"⚠️ 신고 남용자 경고 발급: {reporter_id} (severity: {warning_doc['severity']})")

    logger.info(f"📝 신고 남용 기록: {reporter_id} ({abuse_type})")


# ============================================
# 1. 신고 생성 (일반 유저)
# ============================================

@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "신고 접수 성공"},
        400: {"description": "잘못된 요청"},
        401: {"description": "인증 필요"},
        404: {"description": "대상을 찾을 수 없음"},
        409: {"description": "이미 신고한 대상"},
    }
)
async def create_report(
    report_data: ReportCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> ReportResponse:
    """
    콘텐츠/유저 신고

    Args:
        report_data: 신고 정보
        current_user: 신고자
        db: Firestore 클라이언트

    Returns:
        ReportResponse: 생성된 신고

    Example:
        >>> POST /api/reports
        >>> {
        >>>   "target_type": "post",
        >>>   "target_id": "post123",
        >>>   "category": "profanity",
        >>>   "reason": "욕설이 포함되어 있습니다."
        >>> }
    """
    try:
        logger.info(f"🚨 신고 접수: {current_user.username} -> {report_data.target_type}/{report_data.target_id}")

        # 0. 신고자 남용 체크 (악의적 신고 방지)
        abuse_check = await check_reporter_abuse(db, current_user.uid)
        if abuse_check["is_abusive"]:
            # 남용 기록
            await record_reporter_abuse(
                db,
                current_user.uid,
                abuse_check.get("abuse_type", "unknown"),
                abuse_check["reason"]
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": abuse_check["reason"],
                    "error_code": "REPORT_ABUSE_DETECTED",
                    "abuse_type": abuse_check.get("abuse_type"),
                    "stats": abuse_check.get("stats"),
                }
            )

        # 1. 대상 존재 확인 및 작성자 ID 가져오기
        target_author_id = None

        if report_data.target_type == ReportTargetType.POST:
            doc = db.collection("posts").document(report_data.target_id).get()
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="신고 대상 게시글을 찾을 수 없습니다."
                )
            target_author_id = doc.to_dict().get("author_id")

        elif report_data.target_type == ReportTargetType.COMMENT:
            doc = db.collection("comments").document(report_data.target_id).get()
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="신고 대상 댓글을 찾을 수 없습니다."
                )
            target_author_id = doc.to_dict().get("author_id")

        elif report_data.target_type == ReportTargetType.USER:
            doc = db.collection("users").document(report_data.target_id).get()
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="신고 대상 유저를 찾을 수 없습니다."
                )
            target_author_id = report_data.target_id

        # 2. 자기 자신 신고 방지
        if target_author_id == current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자신의 콘텐츠는 신고할 수 없습니다."
            )

        # 3. 중복 신고 방지 (같은 유저가 같은 대상을 신고)
        existing_reports = list(
            db.collection("reports")
            .where("reporter_id", "==", current_user.uid)
            .where("target_type", "==", report_data.target_type.value)
            .where("target_id", "==", report_data.target_id)
            .where("status", "in", ["pending", "reviewing"])
            .limit(1)
            .stream()
        )

        if existing_reports:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 신고한 대상입니다. 처리 결과를 기다려 주세요."
            )

        # 4. 신고 생성
        report_id = str(uuid.uuid4())[:8]
        now = datetime.now()

        report_doc = {
            "report_id": report_id,
            "reporter_id": current_user.uid,
            "reporter_username": current_user.username,
            "target_type": report_data.target_type.value,
            "target_id": report_data.target_id,
            "target_author_id": target_author_id,
            "category": report_data.category.value,
            "reason": report_data.reason,
            "status": ReportStatus.PENDING.value,
            "admin_note": None,
            "created_at": now,
            "resolved_at": None,
        }

        db.collection("reports").document(report_id).set(report_doc)

        logger.info(f"✅ 신고 접수 완료: {report_id}")

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
            created_at=now,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 신고 생성 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="신고 접수 중 오류가 발생했습니다."
        )


# ============================================
# 2. 내 신고 내역 조회 (일반 유저)
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
    db: firestore.client = Depends(get_firestore_db)
) -> ReportListResponse:
    """내가 접수한 신고 내역 조회"""
    try:
        query = (
            db.collection("reports")
            .where("reporter_id", "==", current_user.uid)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
        )

        total_count = len(list(query.stream()))

        offset = (page - 1) * page_size
        reports_docs = list(query.offset(offset).limit(page_size).stream())

        reports = []
        for doc in reports_docs:
            data = doc.to_dict()
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
                resolved_at=data.get("resolved_at"),
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
            detail="신고 내역 조회 중 오류가 발생했습니다."
        )


# ============================================
# 3. 내 경고 현황 조회 (일반 유저)
# ============================================

@router.get(
    "/my/warnings",
    response_model=UserWarningStatus,
    status_code=status.HTTP_200_OK
)
async def get_my_warnings(
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> UserWarningStatus:
    """내 경고 현황 조회"""
    try:
        # 경고 내역 조회
        warnings_docs = list(
            db.collection("warnings")
            .where("user_id", "==", current_user.uid)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )

        now = datetime.now()
        warnings = []
        active_count = 0

        for doc in warnings_docs:
            data = doc.to_dict()
            expires_at = data.get("expires_at")

            # 만료되지 않은 경고 카운트
            if expires_at is None or expires_at > now:
                active_count += 1

            warnings.append(WarningResponse(
                warning_id=data.get("warning_id"),
                user_id=data.get("user_id"),
                username=data.get("username"),
                reason=data.get("reason"),
                severity=data.get("severity", 1),
                related_report_id=data.get("related_report_id"),
                issued_by=data.get("issued_by"),
                created_at=data.get("created_at"),
                expires_at=expires_at,
            ))

        # 정지 상태 확인
        ban_doc = db.collection("user_bans").document(current_user.uid).get()
        is_banned = False
        ban_expires_at = None

        if ban_doc.exists:
            ban_data = ban_doc.to_dict()
            ban_expires = ban_data.get("expires_at")
            if ban_expires is None or ban_expires > now:
                is_banned = True
                ban_expires_at = ban_expires

        return UserWarningStatus(
            user_id=current_user.uid,
            username=current_user.username,
            total_warnings=len(warnings),
            active_warnings=active_count,
            is_banned=is_banned,
            ban_expires_at=ban_expires_at,
            warnings=warnings,
        )

    except Exception as e:
        logger.error(f"❌ 경고 현황 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="경고 현황 조회 중 오류가 발생했습니다."
        )


# ============================================
# 4. 관리자: 신고 목록 조회
# ============================================

@router.get(
    "/admin",
    response_model=ReportListResponse,
    status_code=status.HTTP_200_OK
)
async def get_reports_admin(
    status_filter: Optional[ReportStatus] = Query(None, description="상태 필터"),
    category_filter: Optional[ReportCategory] = Query(None, description="카테고리 필터"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> ReportListResponse:
    """
    관리자: 신고 목록 조회

    TODO: 실제 admin 권한 체크 필요 (현재는 인증된 유저면 접근 가능)
    """
    try:
        # TODO: Admin 권한 체크
        # if not is_admin(current_user.uid):
        #     raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

        logger.info(f"📋 관리자 신고 목록 조회: {current_user.username}")

        query = db.collection("reports").order_by("created_at", direction=firestore.Query.DESCENDING)

        # 필터 적용
        if status_filter:
            query = query.where("status", "==", status_filter.value)
        if category_filter:
            query = query.where("category", "==", category_filter.value)

        all_docs = list(query.stream())
        total_count = len(all_docs)

        # 페이징
        offset = (page - 1) * page_size
        reports_docs = all_docs[offset:offset + page_size]

        reports = []
        for doc in reports_docs:
            data = doc.to_dict()
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
                resolved_at=data.get("resolved_at"),
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
            detail="신고 목록 조회 중 오류가 발생했습니다."
        )


# ============================================
# 5. 관리자: 신고 처리
# ============================================

@router.put(
    "/admin/{report_id}",
    response_model=ReportResponse,
    status_code=status.HTTP_200_OK
)
async def process_report(
    report_id: str,
    action: ReportAction,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> ReportResponse:
    """
    관리자: 신고 처리 (경고 발급, 콘텐츠 삭제 등)

    Args:
        report_id: 신고 ID
        action: 처리 내용
        current_user: 관리자
        db: Firestore 클라이언트
    """
    try:
        # TODO: Admin 권한 체크
        logger.info(f"⚙️ 신고 처리: {report_id} by {current_user.username}")

        # 신고 조회
        report_doc = db.collection("reports").document(report_id).get()
        if not report_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="신고를 찾을 수 없습니다."
            )

        report_data = report_doc.to_dict()
        now = datetime.now()

        # 1. 신고 상태 업데이트
        update_data = {
            "status": action.status.value,
            "admin_note": action.admin_note,
            "resolved_at": now,
            "resolved_by": current_user.uid,
        }
        db.collection("reports").document(report_id).update(update_data)

        # 2. 경고 발급 (요청 시)
        if action.issue_warning and report_data.get("target_author_id"):
            target_user_id = report_data.get("target_author_id")

            # 대상 유저 정보 조회
            user_doc = db.collection("users").document(target_user_id).get()
            target_username = "Unknown"
            if user_doc.exists:
                target_username = user_doc.to_dict().get("username", "Unknown")

            warning_id = str(uuid.uuid4())[:8]
            # 경고 만료: 90일
            expires_at = now + timedelta(days=90)

            warning_doc = {
                "warning_id": warning_id,
                "user_id": target_user_id,
                "username": target_username,
                "reason": f"신고 처리: {report_data.get('category')} - {action.admin_note or report_data.get('reason')}",
                "severity": action.warning_severity or 1,
                "related_report_id": report_id,
                "issued_by": current_user.uid,
                "created_at": now,
                "expires_at": expires_at,
            }
            db.collection("warnings").document(warning_id).set(warning_doc)
            logger.info(f"⚠️ 경고 발급: {target_user_id} (severity: {action.warning_severity})")

            # 누적 경고 확인 → 자동 정지
            await _check_auto_ban(db, target_user_id, current_user.uid)

        # 3. 콘텐츠 삭제 (요청 시)
        if action.delete_content:
            target_type = report_data.get("target_type")
            target_id = report_data.get("target_id")

            if target_type == "post":
                db.collection("posts").document(target_id).delete()
                # 관련 댓글도 삭제
                comments = db.collection("comments").where("post_id", "==", target_id).stream()
                for comment in comments:
                    comment.reference.delete()
                logger.info(f"🗑️ 게시글 삭제: {target_id}")

            elif target_type == "comment":
                db.collection("comments").document(target_id).delete()
                logger.info(f"🗑️ 댓글 삭제: {target_id}")

        # 업데이트된 신고 반환
        report_data.update(update_data)

        return ReportResponse(
            report_id=report_data.get("report_id"),
            reporter_id=report_data.get("reporter_id"),
            reporter_username=report_data.get("reporter_username"),
            target_type=ReportTargetType(report_data.get("target_type")),
            target_id=report_data.get("target_id"),
            target_author_id=report_data.get("target_author_id"),
            category=ReportCategory(report_data.get("category")),
            reason=report_data.get("reason"),
            status=ReportStatus(update_data.get("status")),
            admin_note=update_data.get("admin_note"),
            created_at=report_data.get("created_at"),
            resolved_at=now,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 신고 처리 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="신고 처리 중 오류가 발생했습니다."
        )


# ============================================
# 6. 자동 정지 체크 (내부 함수)
# ============================================

async def _check_auto_ban(db: firestore.client, user_id: str, admin_id: str):
    """
    누적 경고에 따른 자동 정지

    정책:
    - 활성 경고 3회 → 7일 정지
    - 활성 경고 5회 → 30일 정지
    - 활성 경고 7회 이상 → 영구 정지
    """
    try:
        now = datetime.now()

        # 활성 경고 카운트
        warnings = list(
            db.collection("warnings")
            .where("user_id", "==", user_id)
            .stream()
        )

        active_count = 0
        for w in warnings:
            data = w.to_dict()
            expires_at = data.get("expires_at")
            if expires_at is None or expires_at > now:
                active_count += 1

        logger.info(f"📊 유저 {user_id} 활성 경고: {active_count}회")

        # 정지 기준 확인
        ban_days = None
        if active_count >= 7:
            ban_days = None  # 영구 정지
        elif active_count >= 5:
            ban_days = 30
        elif active_count >= 3:
            ban_days = 7

        if ban_days is not None or active_count >= 7:
            expires_at = now + timedelta(days=ban_days) if ban_days else None

            ban_doc = {
                "user_id": user_id,
                "ban_type": "permanent" if ban_days is None else "temporary",
                "reason": f"누적 경고 {active_count}회로 인한 자동 정지",
                "issued_by": admin_id,
                "started_at": now,
                "expires_at": expires_at,
            }

            db.collection("user_bans").document(user_id).set(ban_doc)
            logger.warning(f"🚫 자동 정지: {user_id} ({ban_days}일)" if ban_days else f"🚫 영구 정지: {user_id}")

    except Exception as e:
        logger.error(f"❌ 자동 정지 체크 실패: {e}")


# ============================================
# 7. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def reports_health():
    """신고 시스템 헬스 체크"""
    return {
        "status": "healthy",
        "service": "reports",
        "timestamp": datetime.now().isoformat()
    }
