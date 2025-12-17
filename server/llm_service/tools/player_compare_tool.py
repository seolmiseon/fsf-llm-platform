"""
선수 비교 Tool
기존 player_compare 로직을 LangChain Tool로 래핑
"""
from langchain.tools import Tool
from typing import Optional
import logging

from ..services.rag_service import RAGService

logger = logging.getLogger(__name__)

# 서비스 인스턴스 (싱글톤)
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """RAGService 싱글톤 인스턴스 반환"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


def compare_players(player_names: str) -> str:
    """
    두 명 이상의 선수를 비교 분석합니다.
    
    Args:
        player_names: 비교할 선수 이름들 (쉼표로 구분, 예: "손흥민, 홀란드")
    
    Returns:
        선수 비교 분석 결과 문자열
    """
    try:
        # 선수 이름 파싱
        names = [name.strip() for name in player_names.split(",")]
        if len(names) < 2:
            return "최소 2명 이상의 선수가 필요합니다."
        
        rag_service = get_rag_service()
        all_sources = []
        
        # 각 선수별로 RAG 검색
        for player_name in names:
            rag_results = rag_service.search(
                collection_name="default",
                query=f"{player_name} 통계 시즌 골 어시스트",
                top_k=3
            )
            
            documents = rag_results.get("documents", [])
            all_sources.extend([f"[{player_name}]\n{doc}" for doc in documents])
        
        # 결과 포맷팅
        context = f"비교 대상: {', '.join(names)}\n\n"
        context += "\n\n".join(all_sources)
        
        logger.info(f"⚽ 선수 비교 완료: {', '.join(names)}")
        return context
        
    except Exception as e:
        logger.error(f"❌ 선수 비교 오류: {str(e)}")
        return f"선수 비교 중 오류가 발생했습니다: {str(e)}"


# LangChain Tool로 변환
PlayerCompareTool = Tool(
    name="player_compare",
    description="두 명 이상의 선수를 비교 분석하는 도구. 선수 이름들을 쉼표로 구분하여 입력합니다 (예: '손흥민, 홀란드').",
    func=compare_players
)

