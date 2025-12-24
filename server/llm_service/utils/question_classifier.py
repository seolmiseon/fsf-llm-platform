"""
질문 분류 유틸리티
단순 질문 vs 복잡한 질문 판단

비용 최적화 목적:
- 단순 질문: chat.py 사용 (LLM 1회 호출) → 저렴
- 복잡한 질문: Agent 사용 (LLM 2회 호출) → 비싸지만 정확

하이브리드 방식 (정확도 + 비용 최적화):
- 정규식으로 먼저 체크 (비용 $0, 빠름)
- 애매한 경우만 LLM 호출 (비용 발생, 하지만 정확)
- 결과를 캐시해서 같은 질문 재사용 (시간이 지날수록 비용 감소)
"""
import re
import logging
from typing import Optional, Literal
import hashlib

logger = logging.getLogger(__name__)

# 질문 분류 결과 캐시 (메모리 기반, 간단하게)
_question_classification_cache: dict[str, tuple[bool, float]] = {}
CACHE_TTL_SECONDS = 86400  # 24시간


def _get_cache_key(query: str) -> str:
    """질문을 정규화해서 캐시 키 생성"""
    normalized = query.strip().lower()
    return hashlib.md5(normalized.encode()).hexdigest()


def _get_cached_result(query: str) -> Optional[bool]:
    """캐시에서 결과 조회"""
    import time
    cache_key = _get_cache_key(query)
    
    if cache_key in _question_classification_cache:
        result, cached_at = _question_classification_cache[cache_key]
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            logger.debug(f"✅ 질문 분류 캐시 히트: {query[:50]}")
            return result
        else:
            # 캐시 만료
            del _question_classification_cache[cache_key]
    
    return None


def _cache_result(query: str, result: bool):
    """결과를 캐시에 저장"""
    import time
    cache_key = _get_cache_key(query)
    _question_classification_cache[cache_key] = (result, time.time())
    logger.debug(f"💾 질문 분류 결과 캐시 저장: {query[:50]}")


async def is_complex_question(query: str, use_llm_fallback: bool = True) -> bool:
    """
    복잡한 질문인지 판단 (하이브리드 방식)
    
    복잡한 질문의 특징:
    1. 여러 Tool이 필요한 경우 (예: "경기 분석하고 영상도 보여줘")
    2. 여러 작업을 요청하는 경우 (예: "비교하고 분석해줘")
    3. 경기 ID가 포함된 경우 (match_analysis Tool 필요)
    4. 여러 선수를 비교하는 경우 (player_compare Tool 필요)
    
    Args:
        query: 사용자 질문
        use_llm_fallback: 애매한 경우 LLM 호출 여부 (기본값: True)
    
    Returns:
        bool: True면 복잡한 질문 (Agent 사용), False면 단순 질문 (chat.py 사용)
    """
    # 1단계: 캐시 확인 (비용 $0)
    cached_result = _get_cached_result(query)
    if cached_result is not None:
        return cached_result
    
    query_lower = query.lower()
    
    # 2단계: 정규식 기반 빠른 판단 (비용 $0)
    # 1. 여러 작업 요청 키워드
    multi_action_keywords = [
        "그리고", "또한", "또", "그리고도", "동시에",
        "and", "also", "plus", "또한"
    ]
    if any(keyword in query_lower for keyword in multi_action_keywords):
        logger.debug("🔍 복잡한 질문 감지: 여러 작업 요청")
        _cache_result(query, True)
        return True
    
    # 2. 경기 ID 패턴 (숫자로만 이루어진 경기 ID)
    match_id_pattern = r'\b\d{6,}\b'  # 6자리 이상 숫자
    if re.search(match_id_pattern, query):
        logger.debug("🔍 복잡한 질문 감지: 경기 ID 포함")
        _cache_result(query, True)
        return True
    
    # 3. 비교 질문 감지 (선수/팀/리그 등 모든 비교)
    comparison_keywords = ["vs", "대", "비교", "compare", "versus"]
    if any(keyword in query_lower for keyword in comparison_keywords):
        # 1단계: 비교 패턴 체크 ("A vs B" 형식)
        comparison_pattern = r'(.+?)\s+(?:vs|대|와|과)\s+(.+?)(?:\s+비교)?'
        if re.search(comparison_pattern, query, re.IGNORECASE):
            logger.debug("🔍 복잡한 질문 감지: 비교 질문 (비교 패턴 발견)")
            _cache_result(query, True)
            return True
        
        # 2단계: 비교 대상 체크 (정규식 패턴으로 선수/팀/리그 모두 감지)
        entity_pattern = r'[가-힣]{2,6}(?:리그)?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}'
        matches = re.findall(entity_pattern, query)
        unique_matches = [m.strip() for m in matches if m.strip() and len(m.strip()) >= 2]
        
        if len(set(unique_matches)) >= 2:
            logger.debug(f"🔍 복잡한 질문 감지: 비교 질문 (비교 대상 {len(set(unique_matches))}개)")
            _cache_result(query, True)
            return True
        
        # "비교"만 있고 비교 대상이 없으면 단순 질문일 수 있음
        if "비교" in query_lower and len(unique_matches) < 2:
            logger.debug("🔍 비교 키워드 있지만 비교 대상 부족 → 단순 질문으로 처리")
            _cache_result(query, False)
            return False
    
    # 4. 복합 작업 키워드
    complex_keywords = [
        "분석하고", "분석 후", "분석해서",
        "보여주고", "보여주면서", "보여줘 그리고",
        "비교하고", "비교 후", "비교해서",
        "analyze and", "compare and", "show and"
    ]
    if any(keyword in query_lower for keyword in complex_keywords):
        logger.debug("🔍 복잡한 질문 감지: 복합 작업 키워드")
        _cache_result(query, True)
        return True
    
    # 5. 영상/비디오 요청
    video_keywords = ["영상", "비디오", "video", "youtube", "유튜브", "클립"]
    if any(keyword in query_lower for keyword in video_keywords):
        logger.debug("🔍 복잡한 질문 감지: 영상 요청")
        _cache_result(query, True)
        return True
    
    # 6. 커뮤니티/게시판 관련 질문
    community_keywords = ["커뮤니티", "게시판", "게시글", "글", "포스트", "community", "post", "posts"]
    if any(keyword in query_lower for keyword in community_keywords):
        logger.debug("🔍 복잡한 질문 감지: 커뮤니티/게시판 요청")
        _cache_result(query, True)
        return True
    
    # 7. 경기 일정/캘린더 관련 질문
    calendar_keywords = [
        "경기 일정", "일정", "스케줄", "schedule", "calendar",
        "오늘 경기", "내일 경기", "이번 주", "이번 달", "주간", "월간",
        "경기표", "fixture", "matches"
    ]
    if any(keyword in query_lower for keyword in calendar_keywords):
        logger.debug("🔍 복잡한 질문 감지: 경기 일정/캘린더 요청")
        _cache_result(query, True)
        return True
    
    # 8. 사용자 선호도 관련 질문
    preference_keywords = ["내가 좋아하는", "내 팀", "내 선호도", "fanpicker", "선호"]
    if any(keyword in query_lower for keyword in preference_keywords):
        logger.debug("🔍 복잡한 질문 감지: 사용자 선호도 요청")
        _cache_result(query, True)
        return True
    
    # 3단계: 애매한 경우 LLM 호출 (선택적, 비용 발생)
    if use_llm_fallback:
        try:
            from ..services.openai_service import OpenAIService
            openai_service = OpenAIService()
            
            # 간단한 프롬프트로 질문 분류
            classification_prompt = """다음 질문이 복잡한 질문인지 단순한 질문인지 판단하세요.

복잡한 질문의 특징:
- 여러 Tool이 필요한 경우 (예: "경기 분석하고 영상도 보여줘")
- 여러 작업을 요청하는 경우 (예: "비교하고 분석해줘")
- 특정 Tool이 필요한 경우 (예: "맨유 vs 토트넘 비교", "오늘 경기 일정")

단순한 질문의 특징:
- 하나의 정보만 요청 (예: "손흥민 최근 폼은?", "토트넘은 어떤 팀인가요?")

질문: {query}

응답 형식: COMPLEX 또는 SIMPLE만 답변하세요.""".format(query=query)
            
            messages = [
                {"role": "system", "content": "당신은 질문 분류 전문가입니다. 질문이 복잡한지 단순한지 판단하세요."},
                {"role": "user", "content": classification_prompt}
            ]
            
            response = await openai_service.chat(messages=messages)
            is_complex = "COMPLEX" in response.upper()
            
            logger.info(f"🤖 LLM 질문 분류: {query[:50]} → {'복잡' if is_complex else '단순'}")
            _cache_result(query, is_complex)
            return is_complex
            
        except Exception as e:
            logger.warning(f"⚠️ LLM 질문 분류 실패: {e}, 기본값(단순) 사용")
            _cache_result(query, False)
            return False
    
    # 기본값: 단순 질문
    logger.debug("✅ 단순 질문으로 판단")
    _cache_result(query, False)
    return False
