"""
질문 분류 유틸리티
단순 질문 vs 복잡한 질문 판단

비용 최적화 목적:
- 단순 질문: chat.py 사용 (LLM 1회 호출) → 저렴
- 복잡한 질문: Agent 사용 (LLM 2회 호출) → 비싸지만 정확

패턴 기반 빠른 판단 (LLM 호출 없이):
- 키워드 매칭으로 빠르게 분류
- 비용 $0 (LLM 호출 없음)
- 속도 빠름 (정규식 매칭)
"""
import re
import logging

logger = logging.getLogger(__name__)


def is_complex_question(query: str) -> bool:
    """
    복잡한 질문인지 판단
    
    복잡한 질문의 특징:
    1. 여러 Tool이 필요한 경우 (예: "경기 분석하고 영상도 보여줘")
    2. 여러 작업을 요청하는 경우 (예: "비교하고 분석해줘")
    3. 경기 ID가 포함된 경우 (match_analysis Tool 필요)
    4. 여러 선수를 비교하는 경우 (player_compare Tool 필요)
    
    Args:
        query: 사용자 질문
    
    Returns:
        bool: True면 복잡한 질문 (Agent 사용), False면 단순 질문 (chat.py 사용)
    """
    query_lower = query.lower()
    
    # 1. 여러 작업 요청 키워드
    multi_action_keywords = [
        "그리고", "또한", "또", "그리고도", "동시에",
        "and", "also", "plus", "또한"
    ]
    if any(keyword in query_lower for keyword in multi_action_keywords):
        logger.debug("🔍 복잡한 질문 감지: 여러 작업 요청")
        return True
    
    # 2. 경기 ID 패턴 (숫자로만 이루어진 경기 ID)
    match_id_pattern = r'\b\d{6,}\b'  # 6자리 이상 숫자
    if re.search(match_id_pattern, query):
        logger.debug("🔍 복잡한 질문 감지: 경기 ID 포함")
        return True
    
    # 3. 여러 선수 비교 (쉼표, vs, 대 등)
    comparison_keywords = ["vs", "대", "비교", "compare", "versus"]
    if any(keyword in query_lower for keyword in comparison_keywords):
        # 선수 이름이 2개 이상인지 확인
        player_name_pattern = r'[가-힣]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+'
        matches = re.findall(player_name_pattern, query)
        if len(matches) >= 2:
            logger.debug("🔍 복잡한 질문 감지: 여러 선수 비교")
            return True
    
    # 4. 복합 작업 키워드
    complex_keywords = [
        "분석하고", "분석 후", "분석해서",
        "보여주고", "보여주면서", "보여줘 그리고",
        "비교하고", "비교 후", "비교해서",
        "analyze and", "compare and", "show and"
    ]
    if any(keyword in query_lower for keyword in complex_keywords):
        logger.debug("🔍 복잡한 질문 감지: 복합 작업 키워드")
        return True
    
    # 5. 영상/비디오 요청 (YouTube Tool 필요할 수 있음)
    video_keywords = ["영상", "비디오", "video", "youtube", "유튜브", "클립"]
    if any(keyword in query_lower for keyword in video_keywords):
        logger.debug("🔍 복잡한 질문 감지: 영상 요청")
        return True
    
    # 6. 커뮤니티/게시판 관련 질문 (posts_search Tool 필요)
    community_keywords = ["커뮤니티", "게시판", "게시글", "글", "포스트", "community", "post", "posts"]
    if any(keyword in query_lower for keyword in community_keywords):
        logger.debug("🔍 복잡한 질문 감지: 커뮤니티/게시판 요청")
        return True
    
    # 7. 경기 일정/캘린더 관련 질문 (calendar Tool 필요)
    calendar_keywords = [
        "경기 일정", "일정", "스케줄", "schedule", "calendar",
        "오늘 경기", "내일 경기", "이번 주", "이번 달", "주간", "월간",
        "경기표", "fixture", "matches"
    ]
    if any(keyword in query_lower for keyword in calendar_keywords):
        logger.debug("🔍 복잡한 질문 감지: 경기 일정/캘린더 요청")
        return True
    
    # 8. 사용자 선호도 관련 질문 (fan_preference Tool 필요)
    preference_keywords = ["내가 좋아하는", "내 팀", "내 선호도", "fanpicker", "선호"]
    if any(keyword in query_lower for keyword in preference_keywords):
        logger.debug("🔍 복잡한 질문 감지: 사용자 선호도 요청")
        return True
    
    # 단순 질문
    logger.debug("✅ 단순 질문으로 판단")
    return False

