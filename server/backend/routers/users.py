"""
Backend Users 라우터 - 유저 정보 관리

현재 사용자 정보 조회 및 수정
JWT 검증 + Firestore 업데이트

📖 FastAPI: https://fastapi.tiangolo.com/tutorial/
📖 Firestore: https://firebase.google.com/docs/firestore
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from firebase_admin import firestore

from ..models import (
    UserResponse, UserUpdate, MessageResponse, ErrorResponse
)
from ..dependencies import (
    get_current_user, get_firestore_db, handle_firestore_error
)

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
    
    Returns:
        UserResponse: 사용자 정보 (uid, email, username, created_at, updated_at)
    
    Raises:
        401: 인증 실패 (토큰 없음, 만료, 유효하지 않음)
        404: 사용자 미발견 (드물지만 발생 가능)
    
    Example:
        >>> GET /api/users/me
        >>> Authorization: Bearer eyJhbGciOiJIUzI1NiI...
        >>> 
        >>> Response 200:
        >>> {
        >>>   "uid": "user_id_123",
        >>>   "email": "user@example.com",
        >>>   "username": "john_doe",
        >>>   "created_at": "2025-10-27T10:00:00",
        >>>   "updated_at": null
        >>> }
    """
    try:
        logger.info(f"📖 사용자 정보 조회: {current_user.uid}")
        
        # 의존성에서 이미 검증되고 조회된 사용자 정보 반환
        # 추가 검증 없이 그대로 반환 (캐싱 효과)
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
        400: {"model": ErrorResponse, "description": "잘못된 요청 (수정할 필드 없음)"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
        403: {"model": ErrorResponse, "description": "다른 사용자 수정 시도"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    }
)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> UserResponse:
    """
    현재 사용자의 정보 수정
    
    ✅ 수정 가능: username
    ❌ 수정 불가: email, uid, created_at
    
    요구사항: Authorization: Bearer <token>
    
    Args:
        user_update: 수정할 정보 (UserUpdate 모델)
        current_user: 현재 인증된 사용자 (의존성 주입)
        db: Firestore 클라이언트 (의존성 주입)
    
    Returns:
        UserResponse: 수정된 사용자 정보
    
    Raises:
        400: 수정할 필드가 없거나 잘못됨
        401: 인증 실패
        403: 다른 사용자를 수정하려고 시도
        500: 서버 오류
    
    Example:
        >>> PUT /api/users/me
        >>> Authorization: Bearer eyJhbGciOiJIUzI1NiI...
        >>> {
        >>>   "username": "new_username"
        >>> }
        >>> 
        >>> Response 200:
        >>> {
        >>>   "uid": "user_id_123",
        >>>   "email": "user@example.com",
        >>>   "username": "new_username",
        >>>   "created_at": "2025-10-27T10:00:00",
        >>>   "updated_at": "2025-10-27T15:30:00"
        >>> }
    """
    try:
        logger.info(f"✏️ 사용자 정보 수정 요청: {current_user.uid}")
        
        # ============================================
        # Step 1: 요청 데이터 검증
        # ============================================
        
        # 수정할 데이터 추출 (None이 아닌 값만)
        update_data = {}
        
        if user_update.username is not None:
            # 빈 문자열 체크
            if not user_update.username.strip():
                logger.warning(f"⚠️ username이 비워있음: {current_user.uid}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username cannot be empty"
                )
            update_data["username"] = user_update.username.strip()
        
        # 수정할 필드가 없으면 400 반환
        if not update_data:
            logger.warning(f"⚠️ 수정할 필드 없음: {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        logger.debug(f"📋 수정할 필드: {list(update_data.keys())}")
        
        # ============================================
        # Step 2: Firestore 업데이트
        # ============================================
        
        try:
            # updated_at 자동 추가
            update_data["updated_at"] = datetime.now()
            
            # Firestore에서 사용자 문서 업데이트
            db.collection("users").document(current_user.uid).update(update_data)
            
            logger.info(f"✅ Firestore 업데이트 완료: {current_user.uid}")
            
        except Exception as e:
            logger.error(f"❌ Firestore 업데이트 실패: {e}")
            raise handle_firestore_error(e)
        
        # ============================================
        # Step 3: 수정된 정보 반환
        # ============================================
        
        updated_user = UserResponse(
            uid=current_user.uid,
            email=current_user.email,
            username=update_data.get("username", current_user.username),
            created_at=current_user.created_at,
            updated_at=update_data.get("updated_at")
        )
        
        logger.info(f"✅ 사용자 정보 수정 완료: {current_user.uid}")
        
        return updated_user
        
    except HTTPException:
        # HTTPException은 그대로 전파
        raise
    except Exception as e:
        logger.error(f"❌ 사용자 정보 수정 중 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user information"
        )


# ============================================
# 3. 헬스 체크
# ============================================

@router.get(
    "/health",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    tags=["Health"]
)
async def users_health():
    """
    Users 서비스 헬스 체크
    
    Returns:
        dict: 서비스 상태
    
    Example:
        >>> GET /api/users/health
        >>> 
        >>> Response 200:
        >>> {
        >>>   "status": "healthy",
        >>>   "service": "users",
        >>>   "timestamp": "2025-10-27T15:30:00.123456"
        >>> }
    """
    return {
        "status": "healthy",
        "service": "users",
        "timestamp": datetime.now().isoformat()
    }