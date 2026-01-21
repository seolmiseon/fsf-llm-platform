
import os
import logging
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
import firebase_admin
from firebase_admin import firestore, auth
from supabase import Client

from .models import UserResponse
from .supabase_config import get_supabase_client

logger = logging.getLogger(__name__)

# ============================================
# 1. JWT 설정
# ============================================

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fsf-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)  # 선택적 인증용


# ============================================
# 2. JWT 토큰 함수
# ============================================

def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """
    JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (예: {"uid": "user123"})
        expires_delta: 만료 시간 (기본값: 24시간)
    
    Returns:
        JWT 토큰 문자열
    
    Example:
        >>> token = create_access_token({"uid": "user123"})
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"✅ JWT 토큰 생성: UID {data.get('uid')}")
    
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    JWT 토큰 검증 및 페이로드 추출
    
    Args:
        token: JWT 토큰
    
    Returns:
        토큰 페이로드
    
    Raises:
        JWTError: 토큰이 유효하지 않음
    
    Example:
        >>> payload = verify_token(token)
        >>> uid = payload.get("uid")
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str = payload.get("uid")
        
        if uid is None:
            logger.warning("⚠️ JWT 검증 실패: uid 없음")
            raise JWTError("uid not found in token")
        
        logger.debug(f"✅ JWT 검증 성공: {uid}")
        return payload
        
    except JWTError as e:
        logger.warning(f"⚠️ JWT 검증 실패: {e}")
        raise


# ============================================
# 3. 현재 사용자 의존성
# ============================================

async def get_current_user(
    credentials = Depends(security),
) -> UserResponse:
    """
    현재 인증된 사용자 조회
    
    Authorization: Bearer <token> 헤더에서 추출
    
    Args:
        credentials: HTTP Bearer 토큰
    
    Returns:
        UserResponse: 사용자 정보
    
    Raises:
        HTTPException: 401 Unauthorized (토큰 없음, 만료, 유효하지 않음)
    
    Example:
        >>> @router.get("/me")
        >>> async def get_me(current_user: UserResponse = Depends(get_current_user)):
        >>>     return current_user
    """
    token = credentials.credentials
    
    # JWT 검증
    try:
        payload = verify_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    uid = payload.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    # Supabase에서 사용자 정보 조회
    try:
        supabase = get_supabase_client()
        result = supabase.table("users").select("*").eq("uid", uid).execute()
        
        if not result.data or len(result.data) == 0:
            logger.warning(f"⚠️ 사용자 미발견: {uid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        user_data = result.data[0]
        
        # UserResponse 생성
        user = UserResponse(
            uid=uid,
            email=user_data.get("email"),
            username=user_data.get("username"),
            created_at=user_data.get("created_at"),
            updated_at=user_data.get("updated_at")
        )
        
        logger.info(f"✅ 사용자 조회 성공: {user.username} ({uid})")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 사용자 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to authenticate user",
        )


async def get_optional_user(
    credentials = Depends(security_optional),
) -> Optional[UserResponse]:
    """
    선택적 사용자 조회 (토큰 없어도 됨)
    
    Args:
        credentials: HTTP Bearer 토큰 (선택)
    
    Returns:
        UserResponse 또는 None
    
    Example:
        >>> @router.get("/posts")
        >>> async def get_posts(user: Optional[UserResponse] = Depends(get_optional_user)):
        >>>     if user:
        >>>         # 사용자별 맞춤 결과
        >>>     else:
        >>>         # 공개 결과
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


from fastapi import status

# ============================================
# 4. Supabase 의존성 (PostgreSQL)
# ============================================

def get_supabase_db() -> Client:
    """
    Supabase 클라이언트 반환 (필수)
    
    - Supabase 미설정 시 500 에러 발생
    - 유저/게시글/신고 등 DB 작업에 사용
    """
    try:
        return get_supabase_client()
    except Exception as e:
        logger.error(f"❌ Supabase 클라이언트 가져오기 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database not initialized"
        )


def get_optional_supabase_db() -> Optional[Client]:
    """
    Supabase 클라이언트 반환 (선택)

    - Supabase 미설정 시 None 반환
    - 캐시 등 선택적 기능에 사용
    """
    try:
        return get_supabase_client()
    except Exception as e:
        logger.warning(f"⚠️ Optional Supabase init failed: {e}")
        return None


# ============================================
# 4-1. Firestore 의존성 (레거시 - 점진적 제거 예정)
# ============================================

def get_firestore_db():
    """
    Firestore 클라이언트 반환 (레거시)
    
    ⚠️ 점진적으로 Supabase로 전환 중
    - 일부 기능에서 아직 사용 중일 수 있음
    """
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase not initialized"
        )
    
    return firestore.client()


def get_optional_firestore_db():
    """
    Firestore 클라이언트 반환 (선택, 레거시)

    ⚠️ 점진적으로 Supabase로 전환 중
    """
    try:
        if not firebase_admin._apps:
            logger.warning("⚠️ Firebase not initialized, skipping Firestore (optional)")
            return None

        return firestore.client()
    except Exception as e:
        logger.warning(f"⚠️ Optional Firestore init failed: {e}")
        return None


# ============================================
# 5. Firebase Auth 의존성
# ============================================

def get_firebase_auth():
    """Firebase Auth 인스턴스"""
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase not initialized"
        )
    
    return auth


# ============================================
# 6. 권한 검증 의존성 (선택사항)
# ============================================

async def verify_admin(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    관리자 권한 검증 (나중에 구현)
    
    현재는 단순히 인증된 사용자만 확인
    """
    # TODO: Firestore에서 admin 플래그 조회
    # if not user_data.get("is_admin"):
    #     raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return current_user


# ============================================
# 7. 오류 처리 유틸리티
# ============================================

class AuthError(Exception):
    """인증 관련 커스텀 에러"""
    pass


class FirestoreError(Exception):
    """Firestore 관련 커스텀 에러"""
    pass


def handle_firestore_error(error: Exception) -> HTTPException:
    """Firestore 에러를 HTTP 예외로 변환"""
    error_str = str(error)
    
    if "ALREADY_EXISTS" in error_str or "already exists" in error_str:
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource already exists"
        )
    elif "NOT_FOUND" in error_str:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed"
        )


def handle_auth_error(error: Exception) -> HTTPException:
    """Firebase Auth 에러를 HTTP 예외로 변환"""
    error_str = str(error).lower()
    
    if "already exists" in error_str or "email-already-in-use" in error_str:
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    elif "invalid-email" in error_str:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    elif "weak-password" in error_str:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too weak (min 6 characters)"
        )
    elif "user-not-found" in error_str:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    elif "wrong-password" in error_str:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )