"""
실시간 정보 필요 여부 판단 Router
제민의 제안 1: Decision Tree (Router 단계 분리)

핵심: "판단만 하는 단계"를 별도로 분리
- Step 1 (Router): "캐시로 해결 가능? 아니면 실시간 API 필수?"
- Step 2 (Execution): 실시간 판정이면 캐시 접근 권한 박탈 → API만 호출
"""
import re
import logging
from typing import Literal

logger = logging.getLogger(__name__)

# 실시간 정보가 필요한 키워드
REALTIME_KEYWORDS = [
    # 시간 관련
    "오늘", "내일", "지금", "현재", "최신", "실시간", "live", "now", "today", "tomorrow",
    "이번 주", "이번 달", "이번 시즌", "현재 시즌",
    # 경기 결과/일정
    "경기 결과", "경기 일정", "스코어", "score", "결과", "일정", "schedule", "fixture",
    "경기표", "경기 스케줄", "다음 경기", "오늘 경기", "내일 경기",
    # 순위/통계 (최신)
    "순위", "랭킹", "ranking", "standings", "최근 성적", "최근 전적",
    # 뉴스/소식
    "뉴스", "소식", "news", "최신 뉴스", "최근 소식",
    # 이적/계약
    "이적", "계약", "transfer", "signing", "최신 이적",
]

# 캐시로 해결 가능한 키워드 (일반적인 정보)
CACHE_SAFE_KEYWORDS = [
    "역사", "history", "과거", "전통", "소개", "설명", "어떤", "무엇", "who", "what",
    "비교", "compare", "차이", "difference", "장단점",
]


def is_realtime_required(query: str) -> Literal["realtime", "cache_ok", "unknown"]:
    """
    실시간 정보가 필요한 질문인지 판단
    
    제민의 제안 1: Decision Tree (Router 단계 분리)
    - 실시간 정보가 필요한 질문: 캐시 스킵, API 필수 호출
    - 캐시로 해결 가능한 질문: 캐시 먼저 확인
    - 애매한 경우: Judge 노드에서 판단
    
    Args:
        query: 사용자 질문
    
    Returns:
        "realtime": 실시간 정보 필수 (캐시 스킵, API 호출)
        "cache_ok": 캐시로 해결 가능 (캐시 먼저 확인)
        "unknown": 애매함 (Judge 노드에서 판단)
    """
    query_lower = query.lower()
    
    # 1. 실시간 정보 필수 키워드 체크
    for keyword in REALTIME_KEYWORDS:
        if keyword in query_lower:
            logger.info(f"🔴 실시간 정보 필수 감지: '{keyword}' 키워드 발견")
            return "realtime"
    
    # 2. 캐시로 해결 가능한 키워드 체크
    cache_safe_count = sum(1 for keyword in CACHE_SAFE_KEYWORDS if keyword in query_lower)
    if cache_safe_count >= 2:  # 2개 이상이면 캐시 안전
        logger.info(f"🟢 캐시 안전 감지: {cache_safe_count}개 캐시 안전 키워드 발견")
        return "cache_ok"
    
    # 3. 애매한 경우: Judge 노드에서 판단
    logger.debug("🟡 애매한 경우: Judge 노드에서 판단 필요")
    return "unknown"


def should_skip_cache(query: str) -> bool:
    """
    캐시를 스킵해야 하는지 판단 (간단한 헬퍼 함수)
    
    Returns:
        True: 캐시 스킵 (실시간 정보 필수)
        False: 캐시 확인 가능
    """
    result = is_realtime_required(query)
    return result == "realtime"

