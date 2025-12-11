"""
경기 분석 엔드포인트
POST /api/llm/match/{match_id}/analysis
POST /api/llm/match/chart/analyze - 경기 차트 이미지 분석
"""
from fastapi import APIRouter, HTTPException, Path, File, UploadFile, Form
from typing import Optional
import logging
from datetime import datetime

from ..models import MatchAnalysisRequest, MatchAnalysisResponse, ErrorResponse
from ..services.openai_service import OpenAIService
from ..services.rag_service import RAGService
from ..external_apis.football_data import FootballDataClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/match", tags=["Match Analysis"])

# 서비스 초기화
openai_service = OpenAIService()
rag_service = RAGService()
football_client = FootballDataClient()

@router.post(
    "/{match_id}/analysis",
    response_model=MatchAnalysisResponse,
    responses={
        200: {"description": "경기 분석 성공"},
        404: {"model": ErrorResponse, "description": "경기 정보 없음"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    }
)
async def analyze_match(
    match_id: int = Path(..., gt=0, description="Football-Data API 경기 ID"),
    request: MatchAnalysisRequest = None
) -> MatchAnalysisResponse:
    """
    경기 AI 분석
    
    Football-Data API → RAG 검색 → OpenAI 분석
    """
    try:
        logger.info(f"📊 경기 분석 요청: 경기 ID {match_id}")
        
        # 요청 기본값 처리
        if request is None:
            request = MatchAnalysisRequest(league="PL")
        
        # 1️⃣ Football-Data API에서 경기 정보 조회
        try:
            match_info = football_client.get_match(match_id)
            logger.info(f"✅ 경기 정보 조회 완료")
        except Exception as e:
            logger.error(f"❌ 경기 정보 조회 실패: {str(e)}")
            raise HTTPException(
                status_code=404,
                detail=f"경기 정보를 찾을 수 없습니다: {match_id}"
            )
        
        # 2️⃣ RAG 검색 (두 팀의 최근 경기 등)
        home_team = match_info.get("homeTeam", {}).get("name", "Unknown")
        away_team = match_info.get("awayTeam", {}).get("name", "Unknown")
        
        # 각 팀별로 검색
        home_results = rag_service.search(
            collection_name=f"league_{request.league}",
            query=f"{home_team} 최근 경기 전적",
            top_k=3
        )
        
        away_results = rag_service.search(
            collection_name=f"league_{request.league}",
            query=f"{away_team} 최근 경기 전적",
            top_k=3
        )
        
        # 소스 통합
        all_sources = []
        for i in range(len(home_results["ids"])):
            all_sources.append({
                "id": home_results["ids"][i],
                "content": home_results["documents"][i],
                "team": home_team,
            })
        
        for i in range(len(away_results["ids"])):
            all_sources.append({
                "id": away_results["ids"][i],
                "content": away_results["documents"][i],
                "team": away_team,
            })
        
        logger.info(f"🔍 RAG 검색 완료: {len(all_sources)}개 소스")
        
        # 3️⃣ 컨텍스트 포맷팅
        context = "\n".join([s.get("content", "") for s in all_sources])
        
        # 4️⃣ OpenAI 호출 - PromptService에서 동적 프롬프트 가져오기
        system_prompt = openai_service.prompt_service.manager.get_prompt(
            'match_analysis_system',
            'SYSTEM_PROMPT'
        )

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"""{home_team} vs {away_team} 경기를 분석해주세요.

팀 데이터:
{context}"""
            }
        ]

        analysis_response = openai_service.chat_completion(messages=messages)

        # 5️⃣ 예측 포함 여부
        prediction = None
        if request.include_prediction:
            prediction_messages = [
                {
                    "role": "system",
                    "content": "축구 경기 예측 전문가입니다."
                },
                {
                    "role": "user",
                    "content": f"{home_team} vs {away_team}: 이 경기의 결과를 예측해주세요. 각 팀의 승리 확률을 백분율로 제시하고 이유를 설명해주세요."
                }
            ]
            prediction = openai_service.chat_completion(messages=prediction_messages)
        
        logger.info(f"✅ 경기 분석 완료")
        
        return MatchAnalysisResponse(
            match_id=match_id,
            home_team=home_team,
            away_team=away_team,
            analysis=analysis_response,
            key_factors=[
                "홈팀 최근 폼",
                "어웨이팀 최근 폼",
                "직접 대면 역사",
                "주요 선수 상태",
                "감독 전술"
            ],
            prediction=prediction,
            sources=all_sources[:5],
            timestamp=datetime.now().isoformat(),
            league=request.league
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 경기 분석 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"경기 분석 실패: {str(e)}"
        )

@router.post(
    "/chart/analyze",
    summary="경기 차트 이미지 분석 (GPT-4 Vision)"
)
async def analyze_chart(
    image: UploadFile = File(..., description="경기 차트 이미지 파일"),
    question: str = Form("경기 차트를 분석해주세요", description="사용자 질문")
):
    """
    경기 차트 이미지를 GPT-4 Vision으로 분석

    - **image**: 업로드할 이미지 파일 (JPG, PNG 등)
    - **question**: 분석 요청 질문 (예: "손흥민 오늘 경기 어땠어?")

    Returns:
        분석 결과 텍스트
    """
    try:
        logger.info(f"📊 경기 차트 분석 요청: {question}")

        # 이미지 파일 읽기
        image_data = await image.read()

        # OpenAI Vision 분석
        analysis_result = await openai_service.analyze_match_chart(
            image_data=image_data,
            user_question=question
        )

        logger.info(f"✅ 경기 차트 분석 완료")

        return {
            "success": True,
            "question": question,
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ 경기 차트 분석 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"경기 차트 분석 실패: {str(e)}"
        )

@router.get(
    "/health",
    response_model=dict,
    summary="경기 분석 서비스 헬스 체크"
)
async def analysis_health():
    """경기 분석 서비스 상태 확인"""
    return {
        "status": "healthy",
        "service": "match_analysis",
        "timestamp": datetime.now().isoformat()
    }