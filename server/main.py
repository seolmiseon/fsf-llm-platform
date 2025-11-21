from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json
import logging
import firebase_admin
from firebase_admin import credentials
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# Firebase 초기화
cred = None
try:
    # 1순위: 환경변수에서 Firebase Service Account Key 읽기 (Cloud Run용)
    firebase_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if firebase_key:
        try:
            service_account_info = json.loads(firebase_key)
            cred = credentials.Certificate(service_account_info)
            logger.info("✅ Firebase 환경변수에서 인증정보 로드 성공")
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ Firebase 환경변수 JSON 파싱 실패: {e}")

    # 2순위: 로컬 파일에서 읽기
    if not cred:
        cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            logger.info("✅ Firebase 로컬 파일에서 인증정보 로드 성공")
        else:
            logger.warning(
                f"⚠️ Firebase Service Account 키 파일을 찾을 수 없습니다: {cred_path}"
            )

    # Firebase Admin SDK 초기화
    if cred and not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        logger.info("✅ Firebase Admin SDK 초기화 성공!")
    elif not cred:
        logger.warning("⚠️ Firebase 인증정보가 없어 Firebase 기능이 비활성화됩니다.")

except Exception as e:
    logger.error(f"⚠️ Firebase Admin SDK 초기화 실패: {e}")

# Backend 라우터들 import
try:
    from backend.routers.auth import router as auth_router
    from backend.routers.posts import router as posts_router
    from backend.routers.users import router as users_router
    from backend.routers.football_data import router as football_router

    logger.info("✅ Backend 라우터들 import 및 등록 성공")
except Exception as e:
    logger.error(f"❌ Backend 라우터 import 실패: {e}")
    # Backend 라우터 실패는 치명적이므로 종료하지 않고 계속 진행
    auth_router = posts_router = users_router = football_router = None

# LLM Service 라우터들 import
try:
    from llm_service.routers.chat import router as chat_router
    from llm_service.routers.match_analysis import router as analysis_router
    from llm_service.routers.player_compare import router as compare_router

    logger.info("✅ LLM Service 라우터들 import 및 등록 성공")
except Exception as e:
    logger.error(f"⚠️ LLM Service 라우터 import 실패: {e}")
    # LLM 라우터 실패해도 계속 진행
    chat_router = analysis_router = compare_router = None

# FastAPI 앱 초기화
app = FastAPI(
    title="FSF Platform",
    version="1.0.0",
    description="Full of Soccer Fun - AI-powered Soccer Analysis Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

logger.info("🏗️ FastAPI 앱 초기화 완료")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 구체적인 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

logger.info("🔐 CORS 미들웨어 등록 완료")

# Backend 라우터 등록
if auth_router:
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
if posts_router:
    app.include_router(posts_router, prefix="/api/posts", tags=["Posts"])
if users_router:
    app.include_router(users_router, prefix="/api/users", tags=["Users"])
if football_router:
    app.include_router(football_router, prefix="/api/football", tags=["Football Data"])

# LLM Service 라우터 등록
if chat_router:
    app.include_router(chat_router, prefix="/api/llm", tags=["LLM Chat"])
if analysis_router:
    app.include_router(analysis_router, prefix="/api/llm", tags=["Match Analysis"])
if compare_router:
    app.include_router(compare_router, prefix="/api/llm", tags=["Player Compare"])

logger.info("🔗 모든 라우터 등록 완료!")


@app.get("/", tags=["Root"])
async def root():
    """루트 엔드포인트"""
    return {
        "message": "FSF Platform API is running!",
        "version": "1.0.0",
        "timestamp": str(datetime.now()),
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """헬스 체크 엔드포인트"""
    firebase_status = "connected" if firebase_admin._apps else "disconnected"
    openai_configured = (
        "configured" if os.getenv("OPENAI_API_KEY") else "not configured"
    )

    return {
        "status": "healthy",
        "service": "FSF API",
        "firebase": firebase_status,
        "openai": openai_configured,
        "port": os.getenv("PORT", "8080"),
        "env": os.getenv("ENV", "development"),
        "timestamp": str(datetime.now()),
    }


@app.get("/debug", tags=["Debug"])
async def debug_info():
    """디버그 정보 엔드포인트 (개발용)"""
    return {
        "env_port": os.getenv("PORT", "NOT_SET"),
        "env_mode": os.getenv("ENV", "NOT_SET"),
        "cwd": os.getcwd(),
        "firebase_apps": len(firebase_admin._apps) if firebase_admin._apps else 0,
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "football_api_key_set": bool(os.getenv("FOOTBALL_API_KEY")),
    }


if __name__ == "__main__":
    import uvicorn
    import sys

    port = int(os.getenv("PORT", 8080))
    logger.info(f"🚀 서버 시작 중... 포트: {port}")
    logger.info(f"🐍 Python 버전: {sys.version}")
    logger.info(f"📁 현재 디렉토리: {os.getcwd()}")
    logger.info(f"📝 환경변수 PORT: {os.getenv('PORT', 'NOT_SET')}")
    logger.info(f"🌍 환경: {os.getenv('ENV', 'development')}")

    try:
        uvicorn.run(
            "main:app", host="0.0.0.0", port=port, reload=False, log_level="info"
        )
    except Exception as e:
        logger.error(f"❌ 서버 시작 실패: {e}")
        sys.exit(1)

# 에러가 어디서 나오는건지....
