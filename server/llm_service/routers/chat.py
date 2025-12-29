from fastapi import APIRouter, HTTPException
from typing import Optional, Dict
import re
import logging
import os
import json
from datetime import datetime

from ..models import ChatRequest, ChatResponse, ErrorResponse
from ..services.openai_service import OpenAIService
from ..services.rag_service import RAGService
from ..services.cache_service import CacheService  # ← 🆕 추가!
from ..services.content_safety_service import ContentSafetyService  # ← 🆕 콘텐츠 필터링 추가!
from ..prompts.chat_prompts import SYSTEM_PROMPT, format_chat_context
from ..routers.stats import get_player_stats
from ..utils.realtime_router import is_realtime_required, should_skip_cache  # ← 🆕 Router 추가
from ..utils.cache_judge import CacheJudge  # ← 🆕 Judge 추가

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# 서비스 초기화
openai_service = OpenAIService()
rag_service = RAGService()

# CacheService 초기화 (ChromaDB 오류 시에도 서버 계속 실행)
try:
    cache_service = CacheService()
except Exception as e:
    logger.warning(f"⚠️ CacheService 초기화 실패 (캐시 기능 비활성화): {e}")
    cache_service = None

# ContentSafetyService 초기화 (콘텐츠 필터링)
try:
    content_safety_service = ContentSafetyService()
except Exception as e:
    logger.warning(f"⚠️ ContentSafetyService 초기화 실패 (필터링 기능 비활성화): {e}")
    content_safety_service = None

# CacheJudge 초기화 (캐시 데이터 충분성 판단)
try:
    cache_judge = CacheJudge()
except Exception as e:
    logger.warning(f"⚠️ CacheJudge 초기화 실패 (Judge 기능 비활성화): {e}")
    cache_judge = None

# 한글 매핑 테이블 제거됨 - JSON에서 ko_name 필드로 직접 검색


def _is_stats_question(query: str) -> bool:
    """
    득점/어시스트/폼 등 통계성 질문인지 간단히 감지
    (1차 버전: 키워드 기반)
    """
    stats_keywords = [
        "득점",
        "골",
        "도움",
        "어시스트",
        "폼",
        "통계",
        "시즌",
        "assist",
        "assists",
        "goals",
        "scorer",
        "top scorer",
        "form",
        "stats",
        "statistics",
    ]
    q = query.lower()
    return any(kw in q or kw in query for kw in stats_keywords)


def _extract_english_name(query: str) -> Optional[str]:
    """
    질문에서 영문 선수 이름 추출
    - 영문 이름이 직접 포함된 경우: 그대로 반환
    - 한글 이름은 _build_stats_context()에서 직접 처리 (JSON의 ko_name 필드로 검색)
    """
    # 영문 이름 패턴 확인 (두 단어 이상)
    matches = re.findall(r"[A-Za-z]+(?:\s+[A-Za-z]+)+", query)
    if matches:
        return matches[0].strip()
    
    return None


async def _build_stats_context(query: str) -> Optional[str]:
    """
    스탯 관련 질문일 때, 선수 통계 API를 호출해 컨텍스트 텍스트 생성
    - JSON 캐시에서만 가져옴 (스크래핑 없음)
    - 한글 이름도 직접 지원
    """
    if not _is_stats_question(query):
        return None

    # 1. 영문 이름 추출 시도
    player_name = _extract_english_name(query)
    
    # 2. 영문 이름이 없으면 한글 이름 추출 시도
    if not player_name:
        korean_matches = re.findall(r"[가-힣]{2,4}", query)
        if korean_matches:
            player_name = korean_matches[0]  # 첫 번째 한글 이름 사용
    
    if not player_name:
        return None

    try:
        # JSON 캐시에서 통계 가져오기 (스크래핑 없음, 한글/영문 모두 지원)
        stats_response = await get_player_stats(player_name)
    except HTTPException:
        return None

    if not stats_response.get("success"):
        return None

    # stats_response 구조를 사람이 읽을 수 있는 텍스트로 변환
    goals = stats_response.get("goals", 0)
    assists = stats_response.get("assists", 0)
    matches = stats_response.get("matches", 0)
    team = stats_response.get("team", "Unknown")

    return (
        f"[선수 통계 (JSON 캐시)]\n"
        f"선수: {stats_response.get('name', player_name)}\n"
        f"팀: {team}\n"
        f"경기 수: {matches}\n"
        f"득점: {goals}골\n"
        f"도움: {assists}개\n"
    )


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
        # 🛡️ STEP 0: 입력 게이트웨이 - 사용자 쿼리 필터링
        # ============================================
        if content_safety_service:
            logger.debug("🛡️ 입력 필터링 중...")
            input_check = content_safety_service.check_input(request.query)
            
            if not input_check.is_safe:
                logger.warning(
                    f"🚫 유해 콘텐츠 감지 (입력): "
                    f"카테고리={input_check.category}, "
                    f"감지된 단어={input_check.detected_words}, "
                    f"이유={input_check.reason}"
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
        # 🚪 입구 (Semantic Router): 실시간 정보 필요 여부 판단
        # ============================================
        # 제민의 제안 1: Decision Tree (Router 단계 분리)
        realtime_status = is_realtime_required(request.query)
        is_stats_q = _is_stats_question(request.query)
        
        # 실시간 정보 필수면 캐시 스킵 (API 호출 필수)
        if realtime_status == "realtime":
            logger.info("🔴 실시간 정보 필수 → 캐시 스킵, API 호출 필수")
            # 캐시 스킵하고 바로 RAG 검색으로 진행
        else:
            # ============================================
            # ✅ 1차 검문소 (Cache Lookup): 유사도 0.75 이상 캐시 조회
            # ============================================
            cached_answer = None
            if not is_stats_q and cache_service:
                logger.debug("Step 1️⃣: ChromaDB 캐시 검색 중... (유사도 0.75 이상)")
                cached_answer = await cache_service.get_cached_answer(request.query)

            if cached_answer:
                # ============================================
                # ⚖️ 2차 검문소 (The Judge): 캐시 데이터 충분성 판단 (하이브리드 최적화)
                # ============================================
                # 제민의 제안 1: Judge 노드에서 최종 판단
                # 하이브리드 최적화: 유사도에 따라 Judge 호출 여부 결정
                similarity = cached_answer.get("similarity", 0.0)
                
                # 유사도 0.9 이상: Judge 스킵 (비용 절감, 바로 캐시 사용)
                if similarity >= 0.9:
                    logger.info(f"✅ 높은 유사도 ({similarity:.2f}) → Judge 스킵, 캐시 사용 (비용 $0)")
                    return ChatResponse(
                        answer=cached_answer["answer"],
                        sources=[],
                        tokens_used=0,
                        confidence=cached_answer["confidence"],
                        cache_hit=True,
                        cache_source="chromadb",
                        cost_saved=0.001,
                    )
                
                # 유사도 0.7~0.9: Judge 호출 (비용 발생, 하지만 필요할 때만)
                elif similarity >= 0.7 and cache_judge:
                    logger.info(f"⚖️ 중간 유사도 ({similarity:.2f}) → Judge 호출 (비용 발생)")
                    judge_result, judge_reason = await cache_judge.judge(
                        query=request.query,
                        cached_answer=cached_answer["answer"],
                        cache_similarity=similarity
                    )
                    
                    if judge_result == "YES":
                        # Judge가 YES → 캐시 사용
                        logger.info(f"✅ Judge 승인: 캐시 사용 (이유: {judge_reason})")
                        return ChatResponse(
                            answer=cached_answer["answer"],
                            sources=[],
                            tokens_used=0,
                            confidence=cached_answer["confidence"],
                            cache_hit=True,
                            cache_source="chromadb",
                            cost_saved=0.001,
                        )
                    elif judge_result == "CALL_API":
                        # 🆕 Judge가 CALL_API → 강제 API 호출 (Hallucination 방지)
                        logger.warning(f"🔴 Judge 강제 API 호출 요청: {judge_reason}")
                        # 캐시 무시하고 RAG 검색으로 진행
                    else:
                        # Judge가 NO/UNCERTAIN → API 호출
                        logger.info(f"⚠️ Judge 거부: API 호출 필요 (판단: {judge_result}, 이유: {judge_reason})")
                        # 캐시 무시하고 RAG 검색으로 진행
                else:
                    # 유사도 0.7 미만 또는 Judge 없음 → 캐시 사용 (낮은 유사도지만 일단 사용)
                    logger.info(f"🎯 캐시된 답변 반환 (유사도 {similarity:.2f}, Judge 스킵)")
                    return ChatResponse(
                        answer=cached_answer["answer"],
                        sources=[],
                        tokens_used=0,
                        confidence=cached_answer["confidence"],
                        cache_hit=True,
                        cache_source="chromadb",
                        cost_saved=0.001,
                    )

        # ============================================
        # ✅ STEP 2: 통계 질문인 경우 JSON 캐시에서 통계 가져오기
        # ============================================
        stats_context = None
        if is_stats_q:
            logger.info("📊 통계 질문 감지 → JSON 캐시에서 통계 확인 중...")
            stats_context = await _build_stats_context(request.query)
            if stats_context:
                logger.info("✅ JSON 캐시에서 통계 데이터 확인")
            else:
                logger.debug("⚠️ JSON 캐시에 통계 데이터 없음 → RAG 검색으로 처리")

        logger.debug("⚠️ 캐시 미스 또는 통계 질문 → RAG 검색으로 처리")

        # ============================================
        # ✅ STEP 3: RAG 검색 ($0) - 임베딩 기반 검색
        # ============================================
        logger.debug("Step 3️⃣: RAG 검색 중... (텍스트 임베딩 사용)")
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
        # ✅ STEP 4: 컨텍스트 포맷팅 (RAG + 선택적 스탯 컨텍스트) ($0)
        # ============================================
        logger.debug("Step 4️⃣: 컨텍스트 포맷팅 중...")
        rag_context_text = format_chat_context(sources)
        
        if stats_context:
            context_text = f"{stats_context}\n\n{rag_context_text}"
        else:
            context_text = rag_context_text

        # ============================================
        # ✅ STEP 5: OpenAI LLM 호출 ($0.001) ⚠️
        # ============================================
        logger.debug("Step 5️⃣: OpenAI LLM 호출 중... (비용 발생!)")
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # 사용자 메시지 추가 (컨텍스트 포함)
        user_message_with_context = f"""컨텍스트:
{context_text}

사용자 질문: {request.query}"""

        messages.append({"role": "user", "content": user_message_with_context})

        # LLM 호출
        ai_response = await openai_service.chat(messages=messages)

        # ============================================
        # ✅ STEP 6: 실제 토큰 수 계산 ($0)
        # ============================================
        logger.debug("Step 6️⃣: 토큰 수 계산 중...")
        input_tokens = openai_service.count_tokens(user_message_with_context)
        output_tokens = openai_service.count_tokens(ai_response)
        total_tokens = input_tokens + output_tokens

        logger.info(
            f"📊 토큰 사용: {total_tokens}개 "
            f"(입력: {input_tokens}, 출력: {output_tokens})"
        )

        # ============================================
        # ✅ STEP 7: ChromaDB에 답변 저장 ($0)
        # ============================================
        logger.debug("Step 7️⃣: ChromaDB에 답변 저장 중...")
        cache_saved = False
        if cache_service:
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
        # ✅ STEP 8: 사용자에게 반환 ✅
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
