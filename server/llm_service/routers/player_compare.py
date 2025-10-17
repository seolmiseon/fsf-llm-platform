"""
선수 비교 엔드포인트
POST /api/llm/player/compare
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging
from datetime import datetime

from ..models import PlayerCompareRequest, PlayerCompareResponse, ErrorResponse
from ..services.openai_service import OpenAIService
from ..services.rag_service import RAGService
from ..external_apis.football_data import FootballDataClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/player", tags=["Player Comparison"])

# 서비스 초기화
openai_service = OpenAIService()
rag_service = RAGService()
football_client = FootballDataClient()

PLAYER_COMPARE_SYSTEM = """당신은 축구 선수 분석 전문가입니다.

제공된 선수 데이터를 바탕으로 비교 분석해주세요.

분석 항목:
1. 기본 정보 (포지션, 나이, 팀)
2. 공격력 분석 (골, 어시스트)
3. 기술 및 스타일
4. 종합 평가

한국어로 객관적이고 명확하게 비교하세요."""

@router.post(
    "/compare",
    response_model=PlayerCompareResponse,
    responses={
        200: {"description": "선수 비교 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    }
)
async def compare_players(request: PlayerCompareRequest) -> PlayerCompareResponse:
    """
    선수 비교 분석
    
    RAG 검색 → 통계 비교 → OpenAI 분석
    """
    try:
        if len(request.player_names) < 2:
            raise HTTPException(
                status_code=400,
                detail="최소 2명 이상의 선수가 필요합니다."
            )
        
        logger.info(f"⚽ 선수 비교 요청: {', '.join(request.player_names)}")
        
        # 1️⃣ RAG 검색 (각 선수의 통계)
        player_data = []
        all_sources = []
        
        for player_name in request.player_names:
            # 선수 정보 검색
            rag_results = rag_service.search(
                collection_name=f"league_{request.league}",
                query=f"{player_name} 통계 시즌 골 어시스트",
                top_k=3
            )
            
            # 선수 데이터 수집
            sources = [
                {
                    "id": rag_results["ids"][i],
                    "content": rag_results["documents"][i],
                    "player": player_name,
                }
                for i in range(len(rag_results["ids"]))
            ]
            
            player_data.append({
                "name": player_name,
                "sources": sources
            })
            
            all_sources.extend(sources)
        
        logger.info(f"🔍 RAG 검색 완료: {len(all_sources)}개 소스")
        
        # 2️⃣ 컨텍스트 포맷팅
        context_text = "\n".join([s.get("content", "") for s in all_sources])
        
        # 3️⃣ OpenAI 호출 - 비교 분석
        player_list_str = ", ".join(request.player_names)
        
        messages = [
            {
                "role": "system",
                "content": PLAYER_COMPARE_SYSTEM
            },
            {
                "role": "user",
                "content": f"""{player_list_str}을(를) {', '.join(request.criteria)} 기준으로 비교 분석해주세요.

선수 데이터:
{context_text}"""
            }
        ]
        
        comparison_response = openai_service.chat_completion(messages=messages)
        
        # 4️⃣ 추천 의견
        recommendation_messages = [
            {
                "role": "system",
                "content": "축구 분석 전문가입니다. 실용적인 권고사항을 제시합니다."
            },
            {
                "role": "user",
                "content": f"위의 비교를 바탕으로 {player_list_str} 중 어떤 선수를 추천하나요? 3-4개의 구체적인 이유를 제시해주세요."
            }
        ]
        
        recommendations_response = openai_service.chat_completion(messages=recommendation_messages)
        
        logger.info(f"✅ 선수 비교 완료")
        
        # 응답 포맷팅
        players_info = [
            {
                "name": player["name"],
                "stats": player["sources"][0]["content"] if player["sources"] else "정보 없음"
            }
            for player in player_data
        ]
        
        return PlayerCompareResponse(
            players=players_info,
            comparison=comparison_response,
            verdict=f"{request.player_names[0]}와 {request.player_names[-1]}의 비교 분석 완료",
            recommendations=recommendations_response.split("\n"),
            criteria=request.criteria,
            sources=all_sources[:5],
            timestamp=datetime.now().isoformat(),
            league=request.league
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 선수 비교 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"선수 비교 실패: {str(e)}"
        )

@router.get(
    "/insights/{player_name}"
)
async def get_player_insights(
    player_name: str,
    league: str = Query("PL", description="리그 코드")
) -> dict:
    """특정 선수의 AI 인사이트"""
    try:
        logger.info(f"⚽ 선수 인사이트 요청: {player_name}")
        
        # RAG 검색
        rag_results = rag_service.search(
            collection_name=f"league_{league}",
            query=f"{player_name} 성능 평가 분석",
            top_k=5
        )
        
        if not rag_results["ids"]:
            raise HTTPException(
                status_code=404,
                detail=f"선수 정보를 찾을 수 없습니다: {player_name}"
            )
        
        # OpenAI 인사이트 생성
        context = "\n".join(rag_results["documents"])
        
        messages = [
            {
                "role": "system",
                "content": "축구 선수 분석 전문가입니다."
            },
            {
                "role": "user",
                "content": f"{player_name}의 강점, 약점, 개선 영역, 향후 전망을 분석해주세요.\n\n배경: {context}"
            }
        ]
        
        insights = openai_service.chat_completion(messages=messages)
        
        logger.info(f"✅ 선수 인사이트 생성 완료")
        
        return {
            "player": player_name,
            "insights": insights,
            "strong_points": [
                "점유율 높음",
                "패스 정확도",
                "경험 풍부"
            ],
            "improvement_areas": [
                "피지컬 강화",
                "세트피스 개선"
            ],
            "league": league,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 선수 인사이트 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"인사이트 생성 실패: {str(e)}"
        )

@router.get(
    "/health",
    response_model=dict,
    summary="선수 비교 서비스 헬스 체크"
)
async def player_health():
    """선수 비교 서비스 상태 확인"""
    return {
        "status": "healthy",
        "service": "player_compare",
        "timestamp": datetime.now().isoformat()
    }