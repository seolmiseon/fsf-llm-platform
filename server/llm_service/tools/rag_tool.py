"""
RAG 검색 Tool
기존 RAGService를 LangChain Tool로 래핑
"""
from langchain.tools import Tool
from typing import Optional
import logging

from ..services.rag_service import RAGService

logger = logging.getLogger(__name__)

# RAGService 인스턴스 (싱글톤)
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """RAGService 싱글톤 인스턴스 반환"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


def rag_search(query: str, top_k: int = 5) -> str:
    """
    축구 관련 정보를 RAG로 검색합니다.
    
    Args:
        query: 검색할 질문 (예: "손흥민 최근 경기")
        top_k: 반환할 결과 개수 (기본값: 5)
    
    Returns:
        검색된 문서들의 내용을 합친 문자열
    """
    try:
        rag_service = get_rag_service()
        results = rag_service.search(
            collection_name="default",
            query=query,
            top_k=top_k
        )
        
        # 결과를 문자열로 변환
        documents = results.get("documents", [])
        if not documents:
            return "검색 결과가 없습니다."
        
        # 문서들을 합쳐서 반환
        combined_text = "\n\n".join([
            f"[문서 {i+1}]\n{doc}" 
            for i, doc in enumerate(documents)
        ])
        
        logger.info(f"🔍 RAG 검색 완료: {len(documents)}개 문서")
        return combined_text
        
    except Exception as e:
        logger.error(f"❌ RAG 검색 오류: {str(e)}")
        return f"검색 중 오류가 발생했습니다: {str(e)}"


# LangChain Tool로 변환
RAGSearchTool = Tool(
    name="rag_search",
    description="축구 관련 정보를 검색하는 도구. 선수, 팀, 경기, 통계 등 축구 관련 질문에 사용합니다.",
    func=rag_search
)

