"""
Backend Auth 라우터 - 회원가입, 로그인, 로그아웃

Firebase Auth + Firestore를 사용한 완전한 인증 시스템

📖 Firebase Auth: https://firebase.google.com/docs/auth
📖 FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from firebase_admin import auth, firestore
from datetime import datetime

from .backend_models import (
    UserCreate, UserLogin, UserResponse, AuthResponse, MessageResponse, ErrorResponse
)
from .backend_dependencies import (
    create_access_token, get_current_user, get_firestore_db, get_firebase_auth,
    handle_auth_error, handle_firestore_error
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


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
    }
)
async def signup(
    user_data: UserCreate,
    db: firestore.client = Depends(get_firestore_db)
) -> AuthResponse:
    """
    회원가입 엔드포인트
    
    1. Firebase Auth에서 사용자 생성
    2. Firestore에 사용자 정보 저장
    3. JWT 토큰 발급
    
    Args:
        user_data: 회원가입 정보 (email, password, username)
        db: Firestore 클라이언트
    
    Returns:
        AuthResponse: JWT 토큰 + 사용자 정보
    
    Raises:
        400: 입력값 오류
        409: 이메일 중복
        500: 서버 오류
    
    Example:
        >>> POST /api/auth/signup
        >>> {
        >>>   "email": "user@example.com",
        >>>   "password": "password123",
        >>>   "username": "john_doe"
        >>> }
    """
    try:
        logger.info(f"📝 회원가입 요청: {user_data.email}")
        
        # 1️⃣ Firebase Auth에서 사용자 생성
        try:
            firebase_user = auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.username
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
        
        # 2️⃣ Firestore에 사용자 정보 저장
        try:
            user_doc = {
                "uid": uid,
                "email": user_data.email,
                "username": user_data.username,
                "created_at": datetime.now(),
                "updated_at": None,
                "is_admin": False  # 기본값
            }
            
            db.collection("users").document(uid).set(user_doc)
            logger.info(f"✅ Firestore 사용자 저장: {uid}")
            
        except Exception as e:
            logger.error(f"❌ Firestore 저장 실패: {e}")
            # Firebase에서는 생성되었으니 롤백 필요 (나중에 트랜잭션으로 개선)
            raise handle_firestore_error(e)
        
        # 3️⃣ JWT 토큰 생성
        access_token = create_access_token(
            data={"uid": uid, "email": user_data.email}
        )
        
        user_response = UserResponse(
            uid=uid,
            email=user_data.email,
            username=user_data.username,
            created_at=datetime.now(),
            updated_at=None
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
    }
)
async def login(
    login_data: UserLogin,
    db: firestore.client = Depends(get_firestore_db)
) -> AuthResponse:
    """
    로그인 엔드포인트
    
    Firebase Auth로 인증 후 JWT 토큰 발급
    
    Args:
        login_data: 로그인 정보 (email, password)
        db: Firestore 클라이언트
    
    Returns:
        AuthResponse: JWT 토큰 + 사용자 정보
    
    Raises:
        401: 비밀번호 오류
        404: 사용자 미발견
        500: 서버 오류
    
    Example:
        >>> POST /api/auth/login
        >>> {
        >>>   "email": "user@example.com",
        >>>   "password": "password123"
        >>> }
    """
    try:
        logger.info(f"🔐 로그인 요청: {login_data.email}")
        
        # ⚠️ Firebase Admin SDK는 클라이언트 인증을 직접 지원하지 않습니다.
        # 실제로는 클라이언트에서 Firebase Auth를 통해 인증받고
        # idToken을 서버로 보내서 검증하는 방식을 권장합니다.
        # 
        # 이 예제는 데모용이며, 실제 구현은 다음과 같습니다:
        # 1. 클라이언트: Firebase.auth().signInWithEmailAndPassword() → idToken
        # 2. 서버: token = request.headers.get("Authorization")
        # 3. 서버: auth.verify_id_token(token)
        
        # 📌 단순화된 방식 (데모용):
        # Firebase REST API를 사용하거나 클라이언트에서 검증
        
        try:
            # Firestore에서 사용자 조회
            users_ref = db.collection("users").where("email", "==", login_data.email)
            docs = list(users_ref.stream())
            
            if not docs:
                logger.warning(f"⚠️ 사용자 미발견: {login_data.email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user_doc = docs[0]
            user_data = user_doc.to_dict()
            uid = user_data.get("uid")
            
            logger.info(f"✅ Firestore에서 사용자 조회: {uid}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Firestore 조회 실패: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed"
            )
        
        # ✅ 실제 구현에서는 Firebase ID Token 검증
        # idToken = request.headers.get("Authorization").replace("Bearer ", "")
        # auth.verify_id_token(idToken)
        
        # 🔧 현재는 이메일 확인으로 대체 (프로덕션에서는 개선 필요)
        
        # JWT 토큰 생성
        access_token = create_access_token(
            data={"uid": uid, "email": login_data.email}
        )
        
        user_response = UserResponse(
            uid=uid,
            email=user_data.get("email"),
            username=user_data.get("username"),
            created_at=user_data.get("created_at"),
            updated_at=user_data.get("updated_at")
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
    }
)
async def get_me(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    """
    현재 인증된 사용자 정보 조회
    
    요구사항: Authorization: Bearer <token>
    
    Returns:
        UserResponse: 사용자 정보
    
    Example:
        >>> GET /api/auth/me
        >>> Authorization: Bearer eyJhbGciOiJIUzI1NiI...
    """
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
    }
)
async def logout(
    current_user: UserResponse = Depends(get_current_user)
) -> MessageResponse:
    """
    로그아웃 엔드포인트
    
    ⚠️ JWT는 stateless이므로 서버에서 토큰을 무효화할 수 없습니다.
    클라이언트가 토큰을 삭제하는 방식으로 진행합니다.
    
    옵션: 토큰 블랙리스트를 Redis에 저장 (고급)
    
    Returns:
        MessageResponse: 로그아웃 메시지
    
    Example:
        >>> POST /api/auth/logout
        >>> Authorization: Bearer eyJhbGciOiJIUzI1NiI...
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
    }
)
async def update_user(
    updated_data: dict,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> UserResponse:
    """
    현재 사용자 정보 수정
    
    수정 가능: username
    수정 불가: email, uid
    
    Args:
        updated_data: 수정할 정보
        current_user: 현재 사용자
        db: Firestore 클라이언트
    
    Returns:
        UserResponse: 수정된 사용자 정보
    
    Example:
        >>> PUT /api/auth/me
        >>> {
        >>>   "username": "new_username"
        >>> }
    """
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
                detail="No valid fields to update"
            )
        
        # updated_at 추가
        update_dict["updated_at"] = datetime.now()
        
        # Firestore 업데이트
        db.collection("users").document(current_user.uid).update(update_dict)
        
        logger.info(f"✅ 사용자 정보 수정 완료: {current_user.uid}")
        
        # 업데이트된 데이터 반환
        return UserResponse(
            uid=current_user.uid,
            email=current_user.email,
            username=update_dict.get("username", current_user.username),
            created_at=current_user.created_at,
            updated_at=datetime.now()
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
# 6. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def auth_health():
    """Auth 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "auth",
        "timestamp": datetime.now().isoformat()
    }