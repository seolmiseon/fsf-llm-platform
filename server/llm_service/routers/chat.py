"""
AI 챗봇 엔드포인트
POST /api/llm/chat
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
import logging
from datetime import datetime

from ..models import ChatRequest, ChatResponse, ErrorResponse
from ..services.openai_service import OpenAIService
from ..services.rag_service import RAGService
from ..prompts.chat_prompts import SYSTEM_PROMPT, format_chat_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# 서비스 초기화
openai_service = OpenAIService()
rag_service = RAGService()


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
    AI 챗봇 엔드포인트

    RAG 검색 → OpenAI GPT → 답변

    Args:
        request: ChatRequest
            - query: 사용자 질문
            - top_k: RAG 검색 결과 개수
            - context: 추가 컨텍스트

    Returns:
        ChatResponse: AI 답변
    """
    try:
        logger.info(f"💬 챗봇 요청: {request.query}")

        # 1️⃣ RAG 검색 (컨텍스트 수집)
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

        # 2️⃣ 컨텍스트 포맷팅
        context_text = format_chat_context(sources)

        # 3️⃣ OpenAI 호출
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # 사용자 메시지 추가 (컨텍스트 포함)
        user_message_with_context = f"""컨텍스트:
{context_text}

사용자 질문: {request.query}"""

        messages.append({"role": "user", "content": user_message_with_context})

        # ✅ 올바른 메서드명: chat_completion() → chat()
        ai_response = openai_service.chat(messages=messages)

        logger.info(f"✅ 챗봇 응답 생성 완료")

        return ChatResponse(
            answer=ai_response,
            sources=[s.get("id", "") for s in sources],
            tokens_used=0,
            confidence=0.85,
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