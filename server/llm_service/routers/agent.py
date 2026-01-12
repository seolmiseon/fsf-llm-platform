"""
Agent 엔드포인트
POST /api/llm/agent
POST /api/llm/agent/stream (스트리밍 버전)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, AsyncGenerator
import logging
from datetime import datetime
import json

from ..models import AgentRequest, AgentResponse, ErrorResponse, ChatRequest, ChatResponse
from ..services.openai_service import OpenAIService
from ..services.content_safety_service import ContentSafetyService
from ..services.cache_service import CacheService
from ..tools import (
    RAGSearchTool,
    MatchAnalysisTool,
    PlayerCompareTool,
    PostsSearchTool,
    create_fan_preference_tool,
    CalendarTool,
)
from ..tools.calendar_tool import calendar_query
# 비용 최적화: 하이브리드 방식 (단순 질문은 chat.py, 복잡한 질문만 Agent)
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

# Tool 리스트 (기본 - user_id 없이 사용)
base_tools = [
    RAGSearchTool,
    MatchAnalysisTool,
    PlayerCompareTool,
    PostsSearchTool,
    CalendarTool,
]

# Agent 초기화 (기본 - user_id 없이 사용)
base_agent = initialize_agent(
    tools=base_tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=10,  # 최대 반복 횟수 제한
    max_execution_time=60  # 최대 실행 시간 60초
)

# Agent 시스템 프롬프트 (하이브리드: 복잡한 질문만 ReAct)
# 제민의 제안 3: ReAct 방식 강제 (하이브리드 최적화: 복잡한 질문만)
# 단순 질문은 일반 프롬프트, 복잡한 질문만 ReAct 형식
BASE_AGENT_SYSTEM_PROMPT = """당신은 축구 분석 전문 AI 어시스턴트입니다.

사용자의 질문을 이해하고, 사용 가능한 도구 중에서 가장 적절한 도구를 선택하여 사용하세요.
도구의 description을 참고하여 질문의 의도에 맞는 도구를 선택하세요.

**도구 사용 원칙:**
1. 캐시 데이터가 있더라도, 실시간 정보가 필요하면 반드시 API를 호출하세요.
2. 도구 실행이 실패하면, 다른 도구를 시도하거나 에러를 명확히 보고하세요.
3. 사용자의 질문에 정확하게 답변하기 위해 필요한 모든 도구를 사용하세요.

한국어로 친절하고 정확하게 답변하세요."""

# 복잡한 질문용 ReAct 프롬프트 (필요할 때만 사용)
REACT_AGENT_SYSTEM_PROMPT = """당신은 축구 분석 전문 AI 어시스턴트입니다.

**중요: 반드시 다음 형식을 지켜야 합니다:**

[생각] 현재 상황을 분석하고, 필요한 정보를 파악합니다.
[행동] 적절한 도구를 선택하고 실행합니다.
[결과] 도구 실행 결과를 확인하고, 다음 단계를 결정합니다.

**도구 사용 원칙:**
1. 캐시 데이터가 있더라도, 실시간 정보가 필요하면 반드시 API를 호출하세요.
2. **도구 실행이 실패하면 (API 제한, 무료티어 초과, 네트워크 오류 등):**
   - 같은 도구를 다시 시도하지 마세요 (최대 1회만 시도)
   - 즉시 다른 도구를 시도하거나, RAG 검색으로 대체하세요
   - 사용자에게 "현재 API 제한으로 인해 실시간 정보를 불러올 수 없습니다. 대신 저장된 정보를 바탕으로 답변드리겠습니다"라고 명확히 설명하세요
3. 도구가 2번 연속 실패하면, RAG 검색으로 대체하고 사용 가능한 정보로 답변하세요.
4. 무한 루프를 방지하기 위해 같은 도구를 2번 이상 반복 사용하지 마세요.

**에러 처리 예시:**
[생각] 사용자가 "오늘 토트넘 경기 일정"을 물었습니다. calendar 도구를 사용해야 합니다.
[행동] calendar 도구를 사용하여 오늘 경기 일정을 조회합니다.
[결과] API 제한 오류 발생 (무료티어 초과 또는 Rate Limit). calendar 도구는 더 이상 사용하지 않고, RAG 검색으로 대체합니다.
[생각] API 실패했으므로 RAG 검색으로 저장된 경기 일정 정보를 찾겠습니다.
[행동] rag_search 도구를 사용하여 토트넘 경기 일정 정보를 검색합니다.
[결과] RAG 검색으로 관련 정보를 찾았습니다. 이 정보를 바탕으로 답변을 생성하겠습니다.

한국어로 친절하고 정확하게 답변하세요. API 제한으로 인한 제약이 있다면 솔직하게 설명하세요."""


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
        # ✅ STEP 2: 단순/복잡 질문 판단 (비용 최적화)
        # ============================================
        # 비용 최적화: 단순 질문은 chat.py (1회 호출), 복잡한 질문만 Agent (2회 호출)
        # 하이브리드 방식: 정규식 먼저 체크 → 애매한 경우만 LLM 호출 → 결과 캐시
        is_complex = await is_complex_question(request.query, use_llm_fallback=True)
        
        if not is_complex:
            # 단순 질문 → 기존 chat.py 로직 사용 (비용 절감: LLM 1회 호출)
            logger.info("💰 단순 질문 감지 → chat.py 사용 (비용 최적화: LLM 1회 호출)")
            chat_request = ChatRequest(query=request.query, top_k=5)
            chat_response = await chat_endpoint(chat_request)
            
            # ChatResponse를 AgentResponse로 변환
            return AgentResponse(
                answer=chat_response.answer,
                tools_used=["rag_search"],  # chat.py는 기본적으로 RAG 검색 사용
                tokens_used=chat_response.tokens_used,
                confidence=chat_response.confidence
            )
        
        # 복잡한 질문 → Agent 로직 사용 (LLM 2회 호출: Tool 선택 + 답변 생성)
        logger.info("🤖 복잡한 질문 감지 → Agent 사용 (LLM 2회 호출)")
        
        # Agent는 캐시를 사용하지 않음 (정확도 우선)
        # 단, 명시적으로 캐시 키로 저장된 경우만 확인
        logger.debug("⚠️ 복잡한 질문은 캐시 스킵 (정확도 우선)")
        
        # ============================================
        # ✅ STEP 3: Agent 실행 (user_id 고려)
        # ============================================
        logger.debug("🤖 Agent 실행 중...")
        
        # user_id가 있으면 FanPreferenceTool 및 CalendarTool (user_id 포함) 활성화
        tools = base_tools.copy()
        agent = base_agent
        # 제민의 제안 3: ReAct 프롬프트 사용 (Hallucination 방지, 정확도 향상)
        # 복잡한 질문이므로 ReAct 형식으로 명시적 사고 과정 유도
        system_prompt = REACT_AGENT_SYSTEM_PROMPT
        
        if request.user_id:
            logger.info(f"👤 사용자 ID 제공됨: {request.user_id} → FanPreferenceTool 및 CalendarTool (개인화) 활성화")
            
            # user_id가 있으면 FanPreferenceTool 추가
            fan_tool = create_fan_preference_tool(user_id=request.user_id)
            tools.append(fan_tool)
            
            # CalendarTool을 user_id 포함 버전으로 교체
            from langchain.tools import Tool
            calendar_tool_with_user = Tool(
                name="calendar",
                description="경기 일정을 조회하는 도구입니다. 지원 기능: 1) 특정 날짜 경기 ('오늘 경기', '내일 경기', '12월 25일 경기 일정'), 2) 특정 팀 경기 ('토트넘 경기', '맨유 경기'), 3) 사용자 선호 팀 경기 ('내가 좋아하는 팀 경기', '내 팀 경기'), 4) 주간 요약 ('이번 주 경기', '주간 일정'), 5) 월간 요약 ('이번 달 경기', '월간 일정'). 날짜 형식: '오늘', '내일', '2025-12-25', '12월 25일' 등.",
                func=lambda query: calendar_query(query.strip(), user_id=request.user_id)
            )
            
            # 기존 CalendarTool 제거하고 새로 추가
            tools = [t for t in tools if t.name != "calendar"]
            tools.append(calendar_tool_with_user)
            
            # Agent 재초기화 (새로운 Tool 포함)
            agent = initialize_agent(
                tools=tools,
                llm=llm,
                agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                verbose=True,
                handle_parsing_errors=True,
                max_iterations=10,  # 최대 반복 횟수 제한
                max_execution_time=60  # 최대 실행 시간 60초
            )
            
            # 프롬프트에 user_id 포함 (ReAct 프롬프트 사용)
            system_prompt = REACT_AGENT_SYSTEM_PROMPT + f"\n\n중요: 현재 사용자 ID는 {request.user_id}입니다. fan_preference 도구와 calendar 도구를 사용할 때는 이 ID를 활용하여 개인화된 답변을 제공하세요."
        
        # Agent 실행 (동기 함수이므로 별도 스레드에서 실행)
        import asyncio
        loop = asyncio.get_event_loop()
        final_prompt = system_prompt + "\n\n사용자 질문: " + request.query
        result = await loop.run_in_executor(
            None,
            lambda: agent.run(final_prompt)
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
        if "오늘" in query_lower or "내일" in query_lower or "경기 일정" in query_lower or "일정" in query_lower:
            tools_used.append("calendar")
        if "내가 좋아하는" in query_lower or "내 팀" in query_lower or "내 선호도" in query_lower or "fanpicker" in query_lower:
            tools_used.append("fan_preference")
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


@router.post("/stream", summary="Agent 스트리밍 응답")
async def agent_chat_stream(request: AgentRequest):
    """
    AI Agent 스트리밍 엔드포인트
    
    Server-Sent Events (SSE)를 사용하여 실시간으로 중간 상태와 최종 답변을 전송합니다.
    사용자는 "경기 일정을 조회하는 중...", "분석 중..." 등의 메시지를 실시간으로 볼 수 있습니다.
    """
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"🤖 Agent 스트리밍 요청: {request.query}")
            
            # 입력 필터링
            if content_safety_service:
                input_check = content_safety_service.check_input(request.query)
                if not input_check.is_safe:
                    error_msg = json.dumps({
                        "type": "error",
                        "message": "부적절한 내용이 포함된 요청입니다."
                    })
                    yield f"data: {error_msg}\n\n"
                    return
            
            # 질문 분류
            yield f"data: {json.dumps({'type': 'status', 'message': '질문을 분석하는 중...'})}\n\n"
            is_complex = await is_complex_question(request.query, use_llm_fallback=True)
            
            if not is_complex:
                # 단순 질문은 chat.py로 처리 (타이핑 효과로 스트리밍)
                yield f"data: {json.dumps({'type': 'status', 'message': '답변을 생성하는 중...'})}\n\n"
                chat_request = ChatRequest(query=request.query, top_k=5)
                chat_response = await chat_endpoint(chat_request)
                
                # 답변을 타이핑 효과로 스트리밍
                yield f"data: {json.dumps({'type': 'answer_start', 'tools_used': ['rag_search']})}\n\n"
                
                chunk_size = 3
                for i in range(0, len(chat_response.answer), chunk_size):
                    chunk = chat_response.answer[i:i + chunk_size]
                    yield f"data: {json.dumps({'type': 'answer_chunk', 'content': chunk})}\n\n"
                
                yield f"data: {json.dumps({'type': 'answer_complete'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            
            # 복잡 질문 - Agent 사용
            yield f"data: {json.dumps({'type': 'status', 'message': '복잡한 질문이 감지되었습니다. 적절한 도구를 선택하는 중...'})}\n\n"
            
            # Agent 설정
            tools = base_tools.copy()
            system_prompt = REACT_AGENT_SYSTEM_PROMPT
            
            # 기본 Agent 초기화
            agent = initialize_agent(
                tools=tools,
                llm=llm,
                agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                verbose=True,
                handle_parsing_errors=True,
                max_iterations=10,  # 최대 반복 횟수 제한
                max_execution_time=60  # 최대 실행 시간 60초
            )
            
            if request.user_id:
                fan_tool = create_fan_preference_tool(user_id=request.user_id)
                tools.append(fan_tool)
                from langchain.tools import Tool
                calendar_tool_with_user = Tool(
                    name="calendar",
                    description="경기 일정을 조회하는 도구입니다...",
                    func=lambda query: calendar_query(query.strip(), user_id=request.user_id)
                )
                tools = [t for t in tools if t.name != "calendar"]
                tools.append(calendar_tool_with_user)
                
                agent = initialize_agent(
                    tools=tools,
                    llm=llm,
                    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                    verbose=True,
                    handle_parsing_errors=True
                )
                system_prompt = REACT_AGENT_SYSTEM_PROMPT + f"\n\n중요: 현재 사용자 ID는 {request.user_id}입니다."
            
            # Tool 실행 추적을 위한 콜백
            tools_used = []
            tool_messages = {
                "calendar": "경기 일정을 조회하는 중...",
                "match_analysis": "경기 데이터를 분석하는 중...",
                "player_compare": "선수 정보를 비교하는 중...",
                "posts_search": "커뮤니티 게시글을 검색하는 중...",
                "fan_preference": "사용자 선호도를 확인하는 중...",
                "rag_search": "관련 정보를 검색하는 중...",
            }
            
            # 질문 내용으로 예상 Tool 추정
            query_lower = request.query.lower()
            if "경기 일정" in query_lower or "일정" in query_lower or "오늘" in query_lower or "내일" in query_lower:
                yield f"data: {json.dumps({'type': 'status', 'message': tool_messages.get('calendar', '도구를 실행하는 중...')})}\n\n"
            elif "비교" in query_lower:
                yield f"data: {json.dumps({'type': 'status', 'message': tool_messages.get('player_compare', '도구를 실행하는 중...')})}\n\n"
            elif "경기" in query_lower and "분석" in query_lower:
                yield f"data: {json.dumps({'type': 'status', 'message': tool_messages.get('match_analysis', '도구를 실행하는 중...')})}\n\n"
            elif "커뮤니티" in query_lower or "게시글" in query_lower:
                yield f"data: {json.dumps({'type': 'status', 'message': tool_messages.get('posts_search', '도구를 실행하는 중...')})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'status', 'message': '관련 정보를 검색하는 중...'})}\n\n"
            
            # Agent 실행
            import asyncio
            loop = asyncio.get_event_loop()
            final_prompt = system_prompt + "\n\n사용자 질문: " + request.query
            
            yield f"data: {json.dumps({'type': 'status', 'message': 'AI가 답변을 생성하는 중...'})}\n\n"
            
            result = await loop.run_in_executor(
                None,
                lambda: agent.run(final_prompt)
            )
            
            # Tool 추정
            if "경기 일정" in query_lower or "일정" in query_lower:
                tools_used.append("calendar")
            if "비교" in query_lower:
                tools_used.append("player_compare")
            if "경기" in query_lower and "분석" in query_lower:
                tools_used.append("match_analysis")
            if "커뮤니티" in query_lower or "게시글" in query_lower:
                tools_used.append("posts_search")
            if "내가 좋아하는" in query_lower or "내 팀" in query_lower:
                tools_used.append("fan_preference")
            if not tools_used:
                tools_used.append("rag_search")
            
            # 출력 필터링
            if content_safety_service:
                output_check = content_safety_service.check_output(result)
                if not output_check.is_safe:
                    result = content_safety_service.filter_text(result)
            
            # 최종 답변을 타이핑 효과로 스트리밍 (토큰 단위)
            yield f"data: {json.dumps({'type': 'answer_start', 'tools_used': tools_used})}\n\n"
            
            # 답변을 한 글자씩 전송 (타이핑 효과)
            chunk_size = 3  # 한 번에 3글자씩 전송 (더 자연스러운 효과)
            for i in range(0, len(result), chunk_size):
                chunk = result[i:i + chunk_size]
                yield f"data: {json.dumps({'type': 'answer_chunk', 'content': chunk})}\n\n"
            
            yield f"data: {json.dumps({'type': 'answer_complete'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"❌ Agent 스트리밍 오류: {str(e)}", exc_info=True)
            error_msg = json.dumps({
                "type": "error",
                "message": f"처리 중 오류가 발생했습니다: {str(e)}"
            })
            yield f"data: {error_msg}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/health", response_model=dict, summary="Agent 서비스 헬스 체크")
async def agent_health():
    """Agent 서비스 상태 확인"""
    return {
        "status": "healthy",
        "service": "agent",
        "tools_count": len(base_tools),
        "tools": [tool.name for tool in base_tools],
        "timestamp": datetime.now().isoformat(),
    }

