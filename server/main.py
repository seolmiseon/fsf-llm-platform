from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json
import base64
import firebase_admin
from firebase_admin import credentials
from datetime import datetime

# 환경 변수 로드
load_dotenv()

# Firebase 초기화
cred = None
try:
    # 1순위: Base64 인코딩된 환경변수 (Cloud Run용)
    firebase_base64 = os.getenv('FIREBASE_SERVICE_ACCOUNT_BASE64')
    if firebase_base64:
        try:
            decoded = base64.b64decode(firebase_base64)
            service_account_info = json.loads(decoded)
            cred = credentials.Certificate(service_account_info)
            print("✅ Firebase Base64 환경변수에서 인증정보 로드 성공")
        except Exception as e:
            print(f"⚠️ Firebase Base64 환경변수 파싱 실패: {e}")
    
    # 2순위: JSON 문자열 환경변수
    if not cred:
        firebase_key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
        if firebase_key:
            try:
                service_account_info = json.loads(firebase_key)
                cred = credentials.Certificate(service_account_info)
                print("✅ Firebase JSON 환경변수에서 인증정보 로드 성공")
            except json.JSONDecodeError as e:
                print(f"⚠️ Firebase JSON 환경변수 파싱 실패: {e}")

    # 3순위: 로컬 파일 (개발용)
    if not cred:
        cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            print("✅ Firebase 로컬 파일에서 인증정보 로드 성공")
        else:
            print(f"⚠️ Firebase Service Account 키 파일을 찾을 수 없습니다: {cred_path}")

    # Firebase 앱 초기화
    if cred and not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK 초기화 성공!")
    elif not cred:
        print("⚠️ Firebase 인증정보가 없어 Firebase 기능이 비활성화됩니다.")

except Exception as e:
    print(f"⚠️ Firebase Admin SDK 초기화 실패: {e}")

# Backend 라우터들 (아직 없음 - 나중에 추가)
# try:
#     from backend.routers.auth import router as auth_router
#     from backend.routers.posts import router as posts_router
#     from backend.routers.football_data import router as football_router
#     print("✅ Backend 라우터들 import 성공")
# except Exception as e:
#     print(f"⚠️ Backend 라우터 import 실패 (아직 구현 안 됨): {e}")

# LLM Service 라우터들 (아직 없음 - 나중에 추가)
# try:
#     from llm_service.routers.chat import router as chat_router
#     from llm_service.routers.match_analysis import router as analysis_router
#     print("✅ LLM Service 라우터들 import 성공")
# except Exception as e:
#     print(f"⚠️ LLM Service 라우터 import 실패 (아직 구현 안 됨): {e}")

# FastAPI 앱 초기화
app = FastAPI(
    title="FSF (Full of Soccer Fun) API",
    version="0.1.0",
    description="축구 플랫폼 통합 API - Backend + LLM Service",
    redirect_slashes=True
)

print("🏗️ FastAPI 앱 초기화 완료")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Backend 라우터 등록 (나중에)
# app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(posts_router, prefix="/api/posts", tags=["Community"])
# app.include_router(football_router, prefix="/api/football", tags=["Football Data"])

# LLM Service 라우터 등록 (나중에)
# app.include_router(chat_router, prefix="/api/llm/chat", tags=["AI Chat"])
# app.include_router(analysis_router, prefix="/api/llm/analysis", tags=["Match Analysis"])

print("🔗 라우터 등록 준비 완료 (구현 예정)")

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "FSF (Full of Soccer Fun) API가 실행 중입니다!",
        "version": "0.1.0",
        "timestamp": str(datetime.now())
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    firebase_status = "connected" if firebase_admin._apps else "disconnected"
    return {
        "status": "healthy",
        "service": "FSF API",
        "firebase": firebase_status,
        "port": os.getenv("PORT", "8000"),
        "env": os.getenv("ENV", "development"),
        "timestamp": str(datetime.now())
    }

@app.get("/debug")
async def debug_info():
    """디버그 정보 엔드포인트"""
    return {
        "env_port": os.getenv("PORT", "NOT_SET"),
        "env_mode": os.getenv("ENV", "NOT_SET"),
        "cwd": os.getcwd(),
        "firebase_apps": len(firebase_admin._apps) if firebase_admin._apps else 0,
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "football_api_key_set": bool(os.getenv("FOOTBALL_DATA_API_KEY")),
    }

if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 FSF 서버 시작 중... 포트: {port}")
    print(f"🐍 Python 버전: {sys.version}")
    print(f"📁 현재 디렉토리: {os.getcwd()}")
    print(f"📝 환경변수 PORT: {os.getenv('PORT', 'NOT_SET')}")
    print(f"🔧 환경: {os.getenv('ENV', 'development')}")
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=(os.getenv('ENV') == 'development'),
            log_level="info"
        )
    except Exception as e:
        print(f"❌ 서버 시작 실패: {e}")
        sys.exit(1)