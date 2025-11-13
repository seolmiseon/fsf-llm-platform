from fastapi import APIRouter, HTTPException
from typing import Optional
import logging
from datetime import datetime

from ..models import ChatRequest, ChatResponse, ErrorResponse
from ..services.openai_service import OpenAIService
from ..services.rag_service import RAGService
from ..services.cache_service import CacheService  # ← 🆕 추가!
from ..prompts.chat_prompts import SYSTEM_PROMPT, format_chat_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# 서비스 초기화
openai_service = OpenAIService()
rag_service = RAGService()
cache_service = CacheService()  # ← 🆕 추가!


@router.post(
    "",
    response_model=ChatResponse,
    responses={
        200: {"description": "챗봇 응답 성공"},
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        500: {"model": ErrorResponse, "description": "서버 오류"},
    },
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    AI 챗봇 엔드포인트 (캐싱 최적화)

    RAG + OpenAI + 캐싱을 통한 비용 최적화

    Args:
        request: ChatRequest
            - query: 사용자 질문
            - top_k: RAG 검색 결과 개수
            - context: 추가 컨텍스트

    Returns:
        ChatResponse: AI 답변 + 캐시 정보

    Example:
        >>> curl -X POST http://localhost:8080/api/llm/chat \\
        ...   -H "Content-Type: application/json" \\
        ...   -d '{"query": "손흥민 최근 폼은?", "top_k": 5}'

        {
            "answer": "손흥민은 최근 5경기에서...",
            "sources": [],
            "tokens_used": 0,
            "confidence": 0.95,
            "cache_hit": true,
            "cache_source": "chromadb",
            "cost_saved": 0.001
        }
    """
    try:
        logger.info(f"💬 챗봇 요청: {request.query}")

        # ============================================
        # ✅ STEP 1: ChromaDB 캐시 확인 ($0)
        # ============================================
        logger.debug("Step 1️⃣: ChromaDB 캐시 검색 중...")
        cached_answer = await cache_service.get_cached_answer(request.query)

        if cached_answer:
            logger.info(f"🎯 캐시된 답변 반환 (비용 $0)")
            return ChatResponse(
                answer=cached_answer["answer"],
                sources=[],  # 캐시 답변은 소스 없음
                tokens_used=0,  # 캐시 히트 = 토큰 0
                confidence=cached_answer["confidence"],
                cache_hit=True,  # ← 🆕
                cache_source="chromadb",  # ← 🆕
                cost_saved=0.001,  # ← 🆕 예상 절감 비용
            )

        logger.debug("⚠️ 캐시 미스 → 새로운 질문으로 처리")

        # ============================================
        # ✅ STEP 2: RAG 검색 ($0)
        # ============================================
        logger.debug("Step 2️⃣: RAG 검색 중...")
        search_query = request.query
        rag_results = rag_service.search(
            collection_name="default", query=search_query, top_k=request.top_k
        )

        # RAG 결과를 소스로 변환
        sources = [
            {
                "id": rag_results["ids"][i],
                "content": rag_results["documents"][i],
                "metadata": rag_results["metadatas"][i],
                "similarity": 1 - rag_results["distances"][i],
            }
            for i in range(len(rag_results["ids"]))
        ]

        logger.info(f"🔍 RAG 검색 완료: {len(sources)}개 소스")

        # ============================================
        # ✅ STEP 3: 컨텍스트 포맷팅 ($0)
        # ============================================
        logger.debug("Step 3️⃣: 컨텍스트 포맷팅 중...")
        context_text = format_chat_context(sources)

        # ============================================
        # ✅ STEP 4: OpenAI LLM 호출 ($0.001) ⚠️
        # ============================================
        logger.debug("Step 4️⃣: OpenAI LLM 호출 중... (비용 발생!)")
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # 사용자 메시지 추가 (컨텍스트 포함)
        user_message_with_context = f"""컨텍스트:
{context_text}

사용자 질문: {request.query}"""

        messages.append({"role": "user", "content": user_message_with_context})

        # LLM 호출
        ai_response = openai_service.chat(messages=messages)

        # ============================================
        # ✅ STEP 5: 실제 토큰 수 계산 ($0)
        # ============================================
        logger.debug("Step 5️⃣: 토큰 수 계산 중...")
        input_tokens = openai_service.count_tokens(user_message_with_context)
        output_tokens = openai_service.count_tokens(ai_response)
        total_tokens = input_tokens + output_tokens

        logger.info(
            f"📊 토큰 사용: {total_tokens}개 "
            f"(입력: {input_tokens}, 출력: {output_tokens})"
        )

        # ============================================
        # ✅ STEP 6: ChromaDB에 답변 저장 ($0)
        # ============================================
        logger.debug("Step 6️⃣: ChromaDB에 답변 저장 중...")
        cache_saved = await cache_service.cache_answer(
            query=request.query,
            answer=ai_response,
            metadata={
                "rag_sources": [s.get("id") for s in sources],
                "model": "gpt-4o-mini",
                "tokens": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            },
        )

        if cache_saved:
            logger.info(f"✅ 답변 캐시 저장 완료")
        else:
            logger.warning(f"⚠️ 답변 캐시 저장 실패 (계속 진행)")

        logger.info(f"✅ 챗봇 응답 생성 & 캐시 저장 완료")

        # ============================================
        # ✅ STEP 7: 사용자에게 반환 ✅
        # ============================================
        return ChatResponse(
            answer=ai_response,
            sources=[s.get("id", "") for s in sources],
            tokens_used=total_tokens,
            confidence=0.85,
            cache_hit=False,  # ← 🆕 캐시 미스
            cache_source="llm",  # ← 🆕 LLM에서 생성
            cost_saved=0.0,  # ← 🆕 캐시 미스이므로 비용 발생
        )

    except Exception as e:
        logger.error(f"❌ 챗봇 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"챗봇 처리 실패: {str(e)}")


@router.get("/health", response_model=dict, summary="챗봇 서비스 헬스 체크")
async def chat_health():
    """챗봇 서비스 상태 확인"""
    return {
        "status": "healthy",
        "service": "chat",
        "timestamp": datetime.now().isoformat(),
    }
