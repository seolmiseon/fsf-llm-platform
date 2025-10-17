"""
LLM Service 라우터 모듈

모든 라우터를 한 곳에서 관리
"""
from .chat import router as chat_router
from .match_analysis import router as analysis_router
from .player_compare import router as compare_router

__all__ = [
    "chat_router",
    "analysis_router", 
    "compare_router"
]