"""
Agent 엔드포인트
POST /api/llm/agent
"""
from fastapi import APIRouter, HTTPException
from typing import List
import logging
from datetime import datetime

from ..models import AgentRequest, AgentResponse, ErrorResponse, ChatRequest, ChatResponse
from ..services.openai_service import OpenAIService
from ..services.content_safety_service import ContentSafetyService
from ..services.cache_service import CacheService
from ..tools import (
    RAGSearchTool,
    MatchAnalysisTool,
    PlayerCompareTool,
    PostsSearchTool,
)
from ..utils.question_classifier import is_complex_question
from ..routers.chat import chat as chat_endpoint  # 기존 chat 엔드포인트 함수
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["AI Agent"])

# 서비스 초기화
openai_service = OpenAIService()

# CacheService 초기화
try:
    cache_service = CacheService()
except Exception as e:
    logger.warning(f"⚠️ CacheService 초기화 실패 (캐시 기능 비활성화): {e}")
    cache_service = None

# Content Safety Service 초기화
try:
    content_safety_service = ContentSafetyService()
except Exception as e:
    logger.warning(f"⚠️ ContentSafetyService 초기화 실패 (필터링 기능 비활성화): {e}")
    content_safety_service = None

# LangChain LLM 초기화
llm = ChatOpenAI(
    model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
    temperature=0.7
)

# Tool 리스트
tools = [
    RAGSearchTool,
    MatchAnalysisTool,
    PlayerCompareTool,
    PostsSearchTool,
]

# Agent 초기화
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    handle_parsing_errors=True
)

# Agent 시스템 프롬프트
AGENT_SYSTEM_PROMPT = """당신은 축구 분석 전문 AI 어시스턴트입니다.

사용자의 질문에 답하기 위해 적절한 도구를 선택하고 사용하세요.

사용 가능한 도구:
1. rag_search: 축구 관련 정보 검색 (선수, 팀, 경기, 통계 등)
2. match_analysis: 경기 분석 (경기 ID 필요)
3. player_compare: 선수 비교 분석 (2명 이상의 선수 이름 필요)
4. posts_search: 커뮤니티 게시판에서 키워드와 관련된 게시글을 찾아주는 도구 (예: "손흥민 관련 글", "커뮤니티 글 추천" 등)

한국어로 친절하고 정확하게 답변하세요."""


@router.post(
    "",
    response_model=AgentResponse,
    responses={
        200: {"description": "Agent 응답 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    },
)
async def agent_chat(request: AgentRequest) -> AgentResponse:
    """
    AI Agent 엔드포인트
    
    사용자 질문을 받아서 적절한 Tool을 자동으로 선택하고 실행합니다.
    
    Args:
        request: AgentRequest
            - query: 사용자 질문
            - context: 추가 컨텍스트 (선택)
    
    Returns:
        AgentResponse: AI 답변 + 사용된 Tool 목록
    """
    try:
        logger.info(f"🤖 Agent 요청: {request.query}")

        # ============================================
        # 🛡️ STEP 1: 입력 게이트웨이 - 사용자 쿼리 필터링
        # ============================================
        if content_safety_service:
            logger.debug("🛡️ 입력 필터링 중...")
            input_check = content_safety_service.check_input(request.query)
            
            if not input_check.is_safe:
                logger.warning(
                    f"🚫 유해 콘텐츠 감지 (입력): "
                    f"카테고리={input_check.category}, "
                    f"감지된 단어={input_check.detected_words}"
                )
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "부적절한 내용이 포함된 요청입니다.",
                        "error_code": "INAPPROPRIATE_CONTENT",
                        "category": input_check.category.value if input_check.category else None,
                        "reason": input_check.reason
                    }
                )
            logger.debug("✅ 입력 필터링 통과")

        # ============================================
        # ✅ STEP 2: 단순/복잡 질문 판단 및 분기
        # ============================================
        is_complex = is_complex_question(request.query)
        
        if not is_complex:
            # 단순 질문 → 기존 chat.py 로직 사용 (비용 절감)
            logger.info("💰 단순 질문 감지 → 기존 chat.py 로직 사용 (LLM 1회 호출)")
            chat_request = ChatRequest(query=request.query, top_k=5)
            chat_response = await chat_endpoint(chat_request)
            
            # ChatResponse를 AgentResponse로 변환
            return AgentResponse(
                answer=chat_response.answer,
                tools_used=["rag_search"],  # chat.py는 기본적으로 RAG 검색 사용
                tokens_used=chat_response.tokens_used,
                confidence=chat_response.confidence
            )
        
        # 복잡한 질문 → Agent 로직 사용
        logger.info("🤖 복잡한 질문 감지 → Agent 로직 사용 (LLM 2회 이상 호출)")
        
        # 복잡한 질문은 캐시를 사용하지 않음 (정확도 우선)
        # 단, 명시적으로 캐시 키로 저장된 경우만 확인
        # (일반 벡터 검색은 유사도가 낮아도 매칭될 수 있어서 위험)
        logger.debug("⚠️ 복잡한 질문은 캐시 스킵 (정확도 우선)")
        
        # ============================================
        # ✅ STEP 3: Agent 실행
        # ============================================
        logger.debug("🤖 Agent 실행 중...")
        
        # Agent 실행 (동기 함수이므로 별도 스레드에서 실행)
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: agent.run(AGENT_SYSTEM_PROMPT + "\n\n사용자 질문: " + request.query)
        )

        # ============================================
        # 🛡️ STEP 4: 출력 필터 - LLM 응답 필터링
        # ============================================
        if content_safety_service:
            logger.debug("🛡️ 출력 필터링 중...")
            output_check = content_safety_service.check_output(result)
            
            if not output_check.is_safe:
                logger.warning(
                    f"🚫 유해 콘텐츠 감지 (출력): "
                    f"카테고리={output_check.category}, "
                    f"감지된 단어={output_check.detected_words}"
                )
                # 유해 콘텐츠가 감지되면 필터링된 텍스트로 대체
                result = content_safety_service.filter_text(result)
                logger.info("✅ 출력 필터링 적용 (유해 콘텐츠 마스킹)")

        # ============================================
        # ✅ STEP 5: 사용된 Tool 추출 (간단한 추정)
        # ============================================
        # Agent가 사용한 Tool은 로그에서 확인 가능하지만,
        # 여기서는 간단하게 질문 내용으로 추정
        tools_used = []
        query_lower = request.query.lower()
        if "커뮤니티" in query_lower or "게시판" in query_lower or "게시글" in query_lower or "글" in query_lower:
            tools_used.append("posts_search")
        if "경기" in query_lower or "match" in query_lower:
            tools_used.append("match_analysis")
        if "비교" in query_lower or "compare" in query_lower:
            tools_used.append("player_compare")
        if not tools_used:
            tools_used.append("rag_search")  # 기본적으로 RAG 검색 사용

        # 토큰 수 계산 (간단한 추정)
        tokens_used = openai_service.count_tokens(request.query) + openai_service.count_tokens(result)

        logger.info(f"✅ Agent 응답 생성 완료 (사용된 Tool: {', '.join(tools_used)})")

        # ============================================
        # ✅ STEP 6: Agent 결과 캐싱
        # ============================================
        if cache_service:
            await cache_service.cache_answer(
                query=f"agent:{request.query}",
                answer=result,
                metadata={
                    "tools_used": tools_used,
                    "model": "gpt-4o-mini",
                    "tokens": tokens_used,
                },
            )
            logger.info("✅ Agent 결과 캐시 저장 완료")

        return AgentResponse(
            answer=result,
            tools_used=tools_used,
            tokens_used=tokens_used,
            confidence=0.85
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Agent 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent 처리 실패: {str(e)}")


@router.get("/health", response_model=dict, summary="Agent 서비스 헬스 체크")
async def agent_health():
    """Agent 서비스 상태 확인"""
    return {
        "status": "healthy",
        "service": "agent",
        "tools_count": len(tools),
        "tools": [tool.name for tool in tools],
        "timestamp": datetime.now().isoformat(),
    }

