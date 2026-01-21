"""
Backend Users 라우터 - 유저 정보 관리

현재 사용자 정보 조회 및 수정
JWT 검증 + Supabase (PostgreSQL) 업데이트

📖 FastAPI: https://fastapi.tiangolo.com/tutorial/
📖 Supabase: https://supabase.com/docs
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from supabase import Client

from ..models import (
    UserResponse, UserUpdate, MessageResponse, ErrorResponse,
    UserProfileResponse, UserProfileUpdate
)
from ..dependencies import get_current_user, get_supabase_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


# ============================================
# 1. 현재 사용자 정보 조회 (Get Current User)
# ============================================

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "사용자 정보 반환"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
        404: {"model": ErrorResponse, "description": "사용자 미발견"},
    }
)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    """
    현재 인증된 사용자의 정보 조회
    
    요구사항: Authorization: Bearer <token>
    """
    try:
        logger.info(f"📖 사용자 정보 조회: {current_user.uid}")
        return current_user
        
    except Exception as e:
        logger.error(f"❌ 사용자 정보 조회 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


# ============================================
# 2. 사용자 정보 수정 (Update User)
# ============================================

@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "수정 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
    }
)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> UserResponse:
    """
    현재 사용자의 정보 수정
    
    ✅ 수정 가능: username
    ❌ 수정 불가: email, uid, created_at
    """
    try:
        logger.info(f"✏️ 사용자 정보 수정 요청: {current_user.uid}")
        
        # 수정할 데이터 추출
        update_data = {}
        
        if user_update.username is not None:
            if not user_update.username.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username cannot be empty"
                )
            update_data["username"] = user_update.username.strip()
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # updated_at 자동 추가
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Supabase 업데이트
        result = db.table("users").update(update_data).eq("uid", current_user.uid).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        updated_data = result.data[0]
        
        updated_user = UserResponse(
            uid=current_user.uid,
            email=current_user.email,
            username=updated_data.get("username", current_user.username),
            created_at=current_user.created_at,
            updated_at=updated_data.get("updated_at")
        )
        
        logger.info(f"✅ 사용자 정보 수정 완료: {current_user.uid}")
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 사용자 정보 수정 중 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user information"
        )


# ============================================
# 3. 유저 프로필 조회 (공개 프로필)
# ============================================

@router.get(
    "/profile/{user_id}",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "프로필 조회 성공"},
        404: {"model": ErrorResponse, "description": "사용자 미발견"},
    }
)
async def get_user_profile(
    user_id: str,
    db: Client = Depends(get_supabase_db)
) -> UserProfileResponse:
    """
    다른 사용자의 공개 프로필 조회
    
    ✅ 인증 불필요 (공개 정보)
    """
    try:
        logger.info(f"👤 유저 프로필 조회: {user_id}")
        
        # Supabase에서 사용자 조회
        result = db.table("users").select("*").eq("uid", user_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.warning(f"⚠️ 사용자 미발견: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = result.data[0]
        
        # 공개 프로필 정보만 반환
        profile = UserProfileResponse(
            uid=user_id,
            username=user_data.get("username", "Unknown"),
            created_at=user_data.get("created_at", datetime.now().isoformat()),
            bio=user_data.get("bio"),
            profile_image=user_data.get("profile_image"),
            favorite_team=user_data.get("favorite_team"),
            favorite_league=user_data.get("favorite_league"),
            post_count=user_data.get("post_count", 0),
            comment_count=user_data.get("comment_count", 0),
            clubs=user_data.get("clubs") or [],
            badges=user_data.get("badges") or []
        )
        
        logger.info(f"✅ 프로필 조회 완료: {user_id}")
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 프로필 조회 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )


# ============================================
# 4. 내 프로필 수정 (확장 필드 포함)
# ============================================

@router.put(
    "/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "프로필 수정 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
    }
)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> UserProfileResponse:
    """
    자신의 프로필 수정 (확장 필드 포함)
    
    ✅ 수정 가능: username, bio, profile_image, favorite_team, favorite_league
    """
    try:
        logger.info(f"✏️ 프로필 수정 요청: {current_user.uid}")
        
        # 수정할 데이터 추출
        update_data = {}
        
        if profile_update.username is not None:
            if not profile_update.username.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username cannot be empty"
                )
            update_data["username"] = profile_update.username.strip()
        
        if profile_update.bio is not None:
            update_data["bio"] = profile_update.bio.strip() if profile_update.bio else None
        
        if profile_update.profile_image is not None:
            update_data["profile_image"] = profile_update.profile_image
        
        if profile_update.favorite_team is not None:
            update_data["favorite_team"] = profile_update.favorite_team.strip() if profile_update.favorite_team else None
        
        if profile_update.favorite_league is not None:
            update_data["favorite_league"] = profile_update.favorite_league.strip() if profile_update.favorite_league else None
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # updated_at 자동 추가
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Supabase 업데이트
        result = db.table("users").update(update_data).eq("uid", current_user.uid).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = result.data[0]
        
        # 프로필 응답 생성
        profile = UserProfileResponse(
            uid=current_user.uid,
            username=user_data.get("username", "Unknown"),
            created_at=user_data.get("created_at", datetime.now().isoformat()),
            bio=user_data.get("bio"),
            profile_image=user_data.get("profile_image"),
            favorite_team=user_data.get("favorite_team"),
            favorite_league=user_data.get("favorite_league"),
            post_count=user_data.get("post_count", 0),
            comment_count=user_data.get("comment_count", 0),
            clubs=user_data.get("clubs") or [],
            badges=user_data.get("badges") or []
        )
        
        logger.info(f"✅ 프로필 수정 완료: {current_user.uid}")
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 프로필 수정 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


# ============================================
# 5. 헬스 체크
# ============================================

@router.get(
    "/health",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    tags=["Health"]
)
async def users_health():
    """Users 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "users",
        "database": "supabase",
        "timestamp": datetime.now().isoformat()
    }
