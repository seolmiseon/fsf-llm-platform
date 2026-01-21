"""
Backend Auth 라우터 - 회원가입, 로그인, 로그아웃

Firebase Auth (인증) + Supabase (사용자 데이터 저장)

📖 Firebase Auth: https://firebase.google.com/docs/auth
📖 Supabase: https://supabase.com/docs
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from firebase_admin import auth
from supabase import Client

from ..models import (
    UserCreate,
    UserLogin,
    UserResponse,
    AuthResponse,
    MessageResponse,
    ErrorResponse,
)
from ..dependencies import (
    create_access_token,
    get_current_user,
    get_supabase_db,
    get_firebase_auth,
    handle_auth_error,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])


# ============================================
# 1. 회원가입 (Signup)
# ============================================

@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "회원가입 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        409: {"model": ErrorResponse, "description": "이메일 중복"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    },
)
async def signup(
    user_data: UserCreate, 
    db: Client = Depends(get_supabase_db)
) -> AuthResponse:
    """
    회원가입 엔드포인트

    1. Firebase Auth에서 사용자 생성 (인증)
    2. Supabase에 사용자 정보 저장 (데이터)
    3. JWT 토큰 발급
    """
    try:
        logger.info(f"📝 회원가입 요청: {user_data.email}")

        # 1️⃣ Firebase Auth에서 사용자 생성
        try:
            firebase_user = auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.username,
            )
            uid = firebase_user.uid
            logger.info(f"✅ Firebase 사용자 생성: {uid}")

        except auth.EmailAlreadyExistsError:
            logger.warning(f"⚠️ 이메일 중복: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail="Email already registered"
            )
        except Exception as e:
            logger.error(f"❌ Firebase 사용자 생성 실패: {e}")
            raise handle_auth_error(e)

        # 2️⃣ Supabase에 사용자 정보 저장
        try:
            user_doc = {
                "uid": uid,
                "email": user_data.email,
                "username": user_data.username,
                "created_at": datetime.now().isoformat(),
                "updated_at": None,
                "is_admin": False,
                "post_count": 0,
                "comment_count": 0,
                "trust_score": 100,
                "warning_count": 0,
                "report_count": 0,
                "is_suspended": False,
            }

            result = db.table("users").insert(user_doc).execute()
            
            if not result.data:
                raise Exception("Failed to insert user into Supabase")
                
            logger.info(f"✅ Supabase 사용자 저장: {uid}")

        except Exception as e:
            logger.error(f"❌ Supabase 저장 실패: {e}")
            # Firebase에서 사용자 삭제 (롤백)
            try:
                auth.delete_user(uid)
                logger.info(f"🔄 Firebase 사용자 롤백: {uid}")
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save user data"
            )

        # 3️⃣ JWT 토큰 생성
        access_token = create_access_token(data={"uid": uid, "email": user_data.email})

        user_response = UserResponse(
            uid=uid,
            email=user_data.email,
            username=user_data.username,
            created_at=datetime.now(),
            updated_at=None,
        )

        logger.info(f"✅ 회원가입 완료: {user_data.username}")

        return AuthResponse(
            access_token=access_token, 
            token_type="bearer", 
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 회원가입 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Signup failed"
        )


# ============================================
# 2. 로그인 (Login)
# ============================================

@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "로그인 성공"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
        404: {"model": ErrorResponse, "description": "사용자 미발견"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    },
)
async def login(
    login_data: UserLogin, 
    db: Client = Depends(get_supabase_db)
) -> AuthResponse:
    """
    로그인 엔드포인트

    Firebase Auth로 인증 후 JWT 토큰 발급
    
    ⚠️ 실제 구현: 클라이언트에서 Firebase Auth로 인증 → idToken 전송 → 서버 검증
    현재는 데모용으로 이메일 조회만 수행
    """
    try:
        logger.info(f"🔐 로그인 요청: {login_data.email}")

        # Supabase에서 사용자 조회
        result = db.table("users").select("*").eq("email", login_data.email).execute()

        if not result.data or len(result.data) == 0:
            logger.warning(f"⚠️ 사용자 미발견: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found"
            )

        user_data = result.data[0]
        uid = user_data.get("uid")

        logger.info(f"✅ Supabase에서 사용자 조회: {uid}")

        # JWT 토큰 생성
        access_token = create_access_token(data={"uid": uid, "email": login_data.email})

        user_response = UserResponse(
            uid=uid,
            email=user_data.get("email"),
            username=user_data.get("username"),
            created_at=user_data.get("created_at"),
            updated_at=user_data.get("updated_at"),
        )

        logger.info(f"✅ 로그인 성공: {user_response.username}")

        return AuthResponse(
            access_token=access_token, 
            token_type="bearer", 
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 로그인 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Login failed"
        )


# ============================================
# 3. 현재 사용자 조회 (Get Current User)
# ============================================

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "사용자 정보"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
        404: {"model": ErrorResponse, "description": "사용자 미발견"},
    },
)
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """현재 인증된 사용자 정보 조회"""
    logger.info(f"📖 사용자 정보 조회: {current_user.uid}")
    return current_user


# ============================================
# 4. 로그아웃 (Logout)
# ============================================

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "로그아웃 성공"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
    },
)
async def logout(
    current_user: UserResponse = Depends(get_current_user),
) -> MessageResponse:
    """
    로그아웃 엔드포인트
    
    JWT는 stateless이므로 클라이언트가 토큰을 삭제하는 방식으로 진행
    """
    logger.info(f"👋 로그아웃: {current_user.username}")

    return MessageResponse(
        message="Logged out successfully. Please delete the token on client side."
    )


# ============================================
# 5. 사용자 정보 수정 (Update User)
# ============================================

@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "수정 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    },
)
async def update_user(
    updated_data: dict,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db),
) -> UserResponse:
    """현재 사용자 정보 수정"""
    try:
        logger.info(f"✏️ 사용자 정보 수정: {current_user.uid}")

        # 수정 가능한 필드만 필터링
        allowed_fields = ["username"]
        update_dict = {
            k: v for k, v in updated_data.items() if k in allowed_fields and v
        }

        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update",
            )

        # updated_at 추가
        update_dict["updated_at"] = datetime.now().isoformat()

        # Supabase 업데이트
        result = db.table("users").update(update_dict).eq("uid", current_user.uid).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        logger.info(f"✅ 사용자 정보 수정 완료: {current_user.uid}")

        return UserResponse(
            uid=current_user.uid,
            email=current_user.email,
            username=update_dict.get("username", current_user.username),
            created_at=current_user.created_at,
            updated_at=datetime.now(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 사용자 정보 수정 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Update failed"
        )


# ============================================
# 6. 세션 갱신 (Activity Update)
# ============================================

@router.post(
    "/activity",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "활동 시각 업데이트 성공"},
        401: {"model": ErrorResponse, "description": "인증 실패"},
    },
)
async def update_activity(
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db),
) -> MessageResponse:
    """사용자 마지막 활동 시각 업데이트"""
    try:
        now = datetime.now().isoformat()
        
        # Supabase에 마지막 활동 시각 저장
        db.table("users").update({
            "updated_at": now,
        }).eq("uid", current_user.uid).execute()
        
        logger.debug(f"✅ 활동 시각 업데이트: {current_user.uid}")
        
        return MessageResponse(message="Activity updated successfully")
        
    except Exception as e:
        logger.error(f"❌ 활동 시각 업데이트 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update activity",
        )


# ============================================
# 7. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def auth_health():
    """Auth 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "auth",
        "database": "supabase",
        "auth": "firebase",
        "timestamp": datetime.now().isoformat(),
    }
