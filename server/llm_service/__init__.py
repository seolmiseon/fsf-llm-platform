"""
LLM Service 패키지

OpenAI + LangChain + ChromaDB를 사용한 AI 기반 축구 분석 서비스
"""

__version__ = "0.1.0"
__author__ = "FSF Team"

# 주요 클래스/함수 임포트
from .services.openai_service import OpenAIService
from .services.rag_service import RAGService
from .services.data_ingestion import DataIngestionService

__all__ = [
    "OpenAIService",
    "RAGService",
    "DataIngestionService",
]