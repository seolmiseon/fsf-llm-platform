from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Firebase 초기화를 먼저 수행
from . import firebase_config


# 환경 변수 로드
load_dotenv()


# FastAPI 앱 초기화
app = FastAPI(
    title="FsF 메인 백엔드 서비스",
    version="1.0.0",
    description="FsF - 축구로 하나되는 플랫폼",
    redirect_slashes=True,
)

# CORS 설정 (프론트엔드 연결용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://fsfproject-fd2e6.web.app/",
        "https://fsfproject-fd2e6.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # preflight 캐시 시간 (1시간)
)


@app.get("/")
async def root():
    return {
        "message": "FsF 메인 백엔드 서비스가 실행 중입니다!",
        "service": "main-backend",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
