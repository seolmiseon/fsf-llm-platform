"""
경기 분석 Tool
기존 match_analysis 로직을 LangChain Tool로 래핑
"""
from langchain.tools import Tool
from typing import Optional
import logging
import json

from ..services.rag_service import RAGService
from ..external_apis.football_data import FootballDataClient

logger = logging.getLogger(__name__)

# 서비스 인스턴스 (싱글톤)
_rag_service: Optional[RAGService] = None
_football_client: Optional[FootballDataClient] = None


def get_services():
    """서비스 인스턴스 반환"""
    global _rag_service, _football_client
    if _rag_service is None:
        _rag_service = RAGService()
    if _football_client is None:
        _football_client = FootballDataClient()
    return _rag_service, _football_client


def analyze_match(match_id: str) -> str:
    """
    경기 분석을 수행합니다.
    
    Args:
        match_id: Football-Data API 경기 ID (문자열)
    
    Returns:
        경기 분석 결과 문자열
    """
    try:
        match_id_int = int(match_id)
        rag_service, football_client = get_services()
        
        # 1. 경기 정보 조회
        match_info = football_client.get_match(match_id_int)
        home_team = match_info.get("homeTeam", {}).get("name", "Unknown")
        away_team = match_info.get("awayTeam", {}).get("name", "Unknown")
        
        # 2. RAG 검색
        home_results = rag_service.search(
            collection_name="default",
            query=f"{home_team} 최근 경기 전적",
            top_k=3
        )
        
        away_results = rag_service.search(
            collection_name="default",
            query=f"{away_team} 최근 경기 전적",
            top_k=3
        )
        
        # 3. 결과 포맷팅
        context = f"홈팀: {home_team}\n어웨이팀: {away_team}\n\n"
        context += "홈팀 최근 전적:\n"
        context += "\n".join(home_results.get("documents", []))
        context += "\n\n어웨이팀 최근 전적:\n"
        context += "\n".join(away_results.get("documents", []))
        
        logger.info(f"📊 경기 분석 완료: {home_team} vs {away_team}")
        return context
        
    except ValueError:
        return f"잘못된 경기 ID입니다: {match_id}"
    except Exception as e:
        logger.error(f"❌ 경기 분석 오류: {str(e)}")
        return f"경기 분석 중 오류가 발생했습니다: {str(e)}"


# LangChain Tool로 변환
MatchAnalysisTool = Tool(
    name="match_analysis",
    description="경기 분석을 수행하는 도구. 경기 ID를 입력받아 두 팀의 최근 전적과 경기 정보를 분석합니다.",
    func=analyze_match
)

