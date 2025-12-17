"""
질문 분류 유틸리티
단순 질문 vs 복잡한 질문 판단
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
    
    # 단순 질문
    logger.debug("✅ 단순 질문으로 판단")
    return False

