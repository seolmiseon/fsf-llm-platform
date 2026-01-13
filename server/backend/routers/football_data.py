import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Path
from firebase_admin import firestore

from llm_service.external_apis.football_data import FootballDataClient
from ..dependencies import get_optional_firestore_db, get_firestore_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/football", tags=["Football Data"])

# Football-Data 클라이언트
try:
    football_client = FootballDataClient()
    logger.info("✅ Football-Data 클라이언트 초기화 성공")
except Exception as e:
    logger.error(f"❌ Football-Data 클라이언트 초기화 실패: {e}")
    football_client = None


# ============================================
# 1. 캐싱 유틸리티
# ============================================

CACHE_DURATION_HOURS = 1  # 캐시 유효 시간: 1시간


def get_cache(db: firestore.client, cache_key: str) -> Optional[dict]:
    """
    Firestore 캐시에서 데이터 조회

    Args:
        db: Firestore 클라이언트
        cache_key: 캐시 키

    Returns:
        캐시된 데이터 또는 None (만료된 경우)
    """
    try:
        cache_doc = db.collection("cache").document(cache_key).get()

        if not cache_doc.exists:
            logger.debug(f"❌ 캐시 미발견: {cache_key}")
            return None

        cache_data = cache_doc.to_dict()
        updated_at = cache_data.get("updated_at")

        # 캐시 유효성 확인
        now = datetime.now()
        elapsed = (now - updated_at).total_seconds()

        if elapsed > CACHE_DURATION_HOURS * 3600:
            logger.info(f"⏰ 캐시 만료: {cache_key} ({elapsed:.0f}초 경과)")
            return None

        logger.info(f"✅ 캐시 히트: {cache_key} ({elapsed:.0f}초 캐시됨)")
        return cache_data.get("data")

    except Exception as e:
        logger.warning(f"⚠️ 캐시 조회 실패: {e}")
        return None


def set_cache(
    db: firestore.client, cache_key: str, data: dict, metadata: Optional[dict] = None
) -> bool:
    """
    Firestore에 캐시 저장

    Args:
        db: Firestore 클라이언트
        cache_key: 캐시 키
        data: 저장할 데이터
        metadata: 추가 메타데이터

    Returns:
        성공 여부
    """
    try:
        cache_doc = {
            "data": data,
            "updated_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=CACHE_DURATION_HOURS),
        }

        if metadata:
            cache_doc.update(metadata)

        db.collection("cache").document(cache_key).set(cache_doc)
        logger.info(f"✅ 캐시 저장: {cache_key}")
        return True

    except Exception as e:
        logger.error(f"❌ 캐시 저장 실패: {e}")
        return False


def clear_cache(db: firestore.client, cache_key: str) -> bool:
    """
    캐시 삭제

    Args:
        db: Firestore 클라이언트
        cache_key: 캐시 키

    Returns:
        성공 여부
    """
    try:
        db.collection("cache").document(cache_key).delete()
        logger.info(f"✅ 캐시 삭제: {cache_key}")
        return True
    except Exception as e:
        logger.error(f"❌ 캐시 삭제 실패: {e}")
        return False


# ============================================
# 2. 순위표 API (Standings)
# ============================================


@router.get(
    "/standings",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "순위표 조회 성공"},
        400: {"description": "잘못된 리그 코드"},
        503: {"description": "Football-Data API 오류"},
    },
)
async def get_standings(
    competition: str = Query("PL", description="리그 코드 (PL, LA, BL, SA, FL1)"),
    force_refresh: bool = Query(False, description="캐시 무시 강제 새로고침"),
    db: firestore.client = Depends(get_optional_firestore_db),
):
    """
    순위표 조회 (캐싱 포함)

    캐시 전략:
    - 1시간 유효
    - 만료 시 Football-Data API 호출
    - force_refresh=true로 캐시 무시 가능

    Args:
        competition: 리그 코드 (PL, LA, BL, SA, FL1)
        force_refresh: 캐시 무시 여부
        db: Firestore 클라이언트

    Returns:
        순위표 데이터

    Example:
        >>> GET /api/football/standings?competition=PL
        >>> GET /api/football/standings?competition=PL&force_refresh=true
    """
    if not football_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Football-Data API client not available",
        )

    try:
        cache_key = f"standings_{competition}"

        logger.info(f"📖 순위표 조회: {competition} (force_refresh={force_refresh})")

        # 1. 캐시 확인 (force_refresh=false인 경우)
        if db and not force_refresh:
            cached_data = get_cache(db, cache_key)
            if cached_data:
                return {
                    "success": True,
                    "data": cached_data,
                    "source": "cache",
                    "cached": True,
                    "timestamp": datetime.now().isoformat(),
                }
        else:
            logger.info(f"🔄 캐시 무시, 강제 새로고침: {competition}")

        # 2. API에서 데이터 가져오기
        logger.info(f"🔄 Football-Data API 호출: {competition}")
        standings = football_client.get_standings(competition)

        if not standings:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to fetch standings for {competition}",
            )

        # 3. 캐시에 저장
        if db:
            set_cache(db, cache_key, standings, metadata={"competition": competition})

        return {
            "success": True,
            "data": standings,
            "source": "api",
            "cached": False,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 순위표 조회 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch standings",
        )


# ============================================
# 3. 경기 일정/결과 API (Matches)
# ============================================


@router.get(
    "/matches",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "경기 조회 성공"},
        400: {"description": "잘못된 요청"},
        503: {"description": "Football-Data API 오류"},
    },
)
async def get_matches(
    competition: str = Query("PL", description="리그 코드"),
    status: str = Query(
        "FINISHED", description="경기 상태 (SCHEDULED, LIVE, FINISHED)"
    ),
    limit: int = Query(10, ge=1, le=100, description="최대 경기 수"),
    force_refresh: bool = Query(False, description="캐시 무시"),
    db: firestore.client = Depends(get_optional_firestore_db),
):
    """
    경기 조회 (캐싱 포함)

    캐시 전략:
    - FINISHED: 1시간 캐싱
    - SCHEDULED/LIVE: 10분 캐싱

    Args:
        competition: 리그 코드
        status: 경기 상태
        limit: 최대 개수 (1-100)
        force_refresh: 캐시 무시
        db: Firestore 클라이언트

    Returns:
        경기 목록

    Example:
        >>> GET /api/football/matches?competition=PL&status=FINISHED&limit=10
    """
    if not football_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Football-Data API client not available",
        )

    try:
        # LIVE는 캐싱 짧게, FINISHED는 길게
        cache_duration = 10 if status in ["SCHEDULED", "LIVE"] else 60

        cache_key = f"matches_{competition}_{status}_{limit}"

        logger.info(f"🎮 경기 조회: {competition}/{status} (limit={limit})")

        # 1. 캐시 확인
        if db and not force_refresh:
            cached_data = get_cache(db, cache_key)
            if cached_data:
                return {
                    "success": True,
                    "data": cached_data,
                    "source": "cache",
                    "cached": True,
                    "cache_duration_minutes": cache_duration,
                    "timestamp": datetime.now().isoformat(),
                }

        # 2. API에서 데이터 가져오기
        logger.info(f"🔄 Football-Data API 호출: 경기")
        matches = football_client.get_matches(
            competition=competition, status=status, limit=limit
        )

        if not matches:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to fetch matches",
            )

        # 3. 캐시에 저장 (기간은 상태에 따라)
        if db:
            set_cache(
                db,
                cache_key,
                matches,
                metadata={
                    "competition": competition,
                    "status": status,
                    "cache_duration_minutes": cache_duration,
                },
            )

        return {
            "success": True,
            "data": matches,
            "source": "api",
            "cached": False,
            "cache_duration_minutes": cache_duration,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 경기 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch matches",
        )


@router.get(
    "/matches/live",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "라이브 경기 조회 성공"},
        503: {"description": "Football-Data API 오류"},
    },
)
async def get_live_matches(
    force_refresh: bool = Query(False, description="캐시 무시"),
    db: firestore.client = Depends(get_optional_firestore_db),
):
    """
    진행 중인 라이브 경기 조회 (모든 리그)

    캐시 전략:
    - 10분 캐싱 (실시간 정보이므로 짧게)

    Args:
        force_refresh: 캐시 무시
        db: Firestore 클라이언트

    Returns:
        라이브 경기 목록

    Example:
        >>> GET /api/football/matches/live
    """
    if not football_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Football-Data API client not available",
        )

    try:
        cache_key = "matches_live_all"
        cache_duration = 10  # 10분 캐싱

        logger.info(f"🎮 라이브 경기 조회 (force_refresh={force_refresh})")

        # 1. 캐시 확인
        if db and not force_refresh:
            cached_data = get_cache(db, cache_key)
            if cached_data:
                return {
                    "success": True,
                    "data": cached_data,
                    "source": "cache",
                    "cached": True,
                    "cache_duration_minutes": cache_duration,
                    "timestamp": datetime.now().isoformat(),
                }

        # 2. API에서 데이터 가져오기
        logger.info(f"🔄 Football-Data API 호출: 라이브 경기")
        matches = football_client.get_live_matches()

        if not matches:
            # 라이브 경기가 없을 수도 있으므로 빈 배열 반환
            return {
                "success": True,
                "data": [],
                "source": "api",
                "cached": False,
                "cache_duration_minutes": cache_duration,
                "timestamp": datetime.now().isoformat(),
            }

        # 3. 캐시에 저장
        if db:
            set_cache(
                db,
                cache_key,
                matches,
                metadata={
                    "status": "LIVE",
                    "cache_duration_minutes": cache_duration,
                },
            )

        return {
            "success": True,
            "data": matches,
            "source": "api",
            "cached": False,
            "cache_duration_minutes": cache_duration,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 라이브 경기 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch live matches",
        )


# ============================================
# 4. 팀 정보 API (Teams)
# ============================================


@router.get("/teams/{competition}")
async def get_teams(
    competition: str = Path(..., description="리그 코드 (PL, LA, BL 등)"),
    force_refresh: bool = Query(False, description="캐시 무시"),
    db: firestore.client = Depends(get_firestore_db),
):
    """
    특정 리그의 팀 목록 조회 (캐싱 포함)

    캐시 유효: 1시간

    Args:
        competition: 리그 코드
        force_refresh: 캐시 무시
        db: Firestore 클라이언트

    Returns:
        팀 목록

    Example:
        >>> GET /api/football/teams/PL
    """
    if not football_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Football-Data API client not available",
        )

    try:
        cache_key = f"teams_{competition}"

        logger.info(f"⚽ 팀 조회: {competition}")

        # 1. 캐시 확인
        if not force_refresh:
            cached_data = get_cache(db, cache_key)
            if cached_data:
                return {
                    "success": True,
                    "data": cached_data,
                    "source": "cache",
                    "cached": True,
                    "timestamp": datetime.now().isoformat(),
                }

        # 2. API에서 데이터 가져오기
        logger.info(f"🔄 Football-Data API 호출: 팀")
        teams = football_client.get_teams_by_competition(competition)

        if not teams:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to fetch teams for {competition}",
            )

        # 3. 캐시에 저장
        set_cache(db, cache_key, teams, metadata={"competition": competition})

        return {
            "success": True,
            "data": teams,
            "source": "api",
            "cached": False,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 팀 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch teams",
        )


# ============================================
# 5. 캐시 관리 API (Admin)
# ============================================


@router.delete(
    "/cache/{cache_key}",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "캐시 삭제 성공"},
        404: {"description": "캐시 미발견"},
    },
)
async def delete_cache(
    cache_key: str, db: firestore.client = Depends(get_firestore_db)
):
    """
    특정 캐시 삭제

    Args:
        cache_key: 캐시 키 (예: standings_PL, matches_PL_FINISHED_10)
        db: Firestore 클라이언트

    Returns:
        삭제 결과

    Example:
        >>> DELETE /api/football/cache/standings_PL
    """
    try:
        logger.info(f"🗑️ 캐시 삭제: {cache_key}")

        success = clear_cache(db, cache_key)

        if success:
            return {
                "message": f"Cache '{cache_key}' deleted successfully",
                "cache_key": cache_key,
                "timestamp": datetime.now().isoformat(),
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cache '{cache_key}' not found",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 캐시 삭제 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete cache",
        )


# ============================================
# 6. 캐시 통계 API
# ============================================


@router.get("/cache/stats", status_code=status.HTTP_200_OK)
async def get_cache_stats(db: firestore.client = Depends(get_firestore_db)):
    """
    캐시 통계 조회

    Returns:
        전체 캐시 개수, 만료된 캐시, 저장 크기 등

    Example:
        >>> GET /api/football/cache/stats
    """
    try:
        cache_docs = list(db.collection("cache").stream())

        total_count = len(cache_docs)
        expired_count = 0
        valid_count = 0
        now = datetime.now()

        for doc in cache_docs:
            expires_at = doc.get("expires_at")
            if expires_at < now:
                expired_count += 1
            else:
                valid_count += 1

        return {
            "total_cache": total_count,
            "valid_cache": valid_count,
            "expired_cache": expired_count,
            "cache_duration_hours": CACHE_DURATION_HOURS,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ 캐시 통계 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch cache stats",
        )


# ============================================
# 7. 헬스 체크
# ============================================


@router.get("/health", response_model=dict)
async def football_health():
    """Football-Data 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "football_data",
        "api_available": football_client is not None,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/competitions")
async def get_competitions():
    """리그 목록 조회"""
    try:
        competitions = football_client.get_competitions()
        return {"success": True, "data": competitions}
    except Exception as e:
        logger.error(f"❌ 리그 목록 조회 실패: {e}")
        raise HTTPException(status_code=503, detail=str(e))
