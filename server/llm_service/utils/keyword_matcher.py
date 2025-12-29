"""
Keyword 매칭 유틸리티
제민의 제안 2: 하이브리드 검색 (Vector + Keyword) 비중 조절

핵심 키워드(고유명사, 날짜 등)를 추출하여 정확 매칭
- Vector 유사도만으로는 고유명사/날짜 정확 매칭 어려움
- Keyword 매칭으로 문맥이 비슷하다고 속아 넘어가는 것 방지
"""
import re
import logging
from typing import Set, List, Tuple

logger = logging.getLogger(__name__)


def extract_keywords(text: str) -> Set[str]:
    """
    텍스트에서 핵심 키워드 추출
    
    추출 대상:
    1. 고유명사 (영문 대문자 시작, 한글 이름)
    2. 날짜/시간 표현
    3. 팀명/리그명
    4. 중요한 명사 (2글자 이상 한글, 3글자 이상 영문)
    
    Args:
        text: 분석할 텍스트
    
    Returns:
        추출된 키워드 집합 (소문자 정규화)
    
    Example:
        >>> extract_keywords("손흥민은 토트넘에서 2024년에 활약했습니다")
        {"손흥민", "토트넘", "2024"}
    """
    keywords = set()
    text_lower = text.lower()
    
    # 1. 영문 고유명사 (대문자 시작, 2단어 이상)
    # 예: "Son Heung-min", "Premier League", "Arsenal"
    proper_nouns_en = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b', text)
    for noun in proper_nouns_en:
        keywords.add(noun.lower())
    
    # 2. 한글 이름/팀명 (2-4글자 한글)
    # 예: "손흥민", "토트넘", "프리미어리그"
    korean_names = re.findall(r'[가-힣]{2,4}', text)
    for name in korean_names:
        # 일반 조사/어미 제외 (예: "에서", "은", "의")
        if name not in ["에서", "은", "는", "이", "가", "의", "을", "를", "와", "과", "도", "만"]:
            keywords.add(name)
    
    # 3. 날짜 표현
    # 예: "2024년", "2024-01-01", "1월", "오늘", "내일"
    dates = re.findall(r'\d{4}[-년]|\d{1,2}월|\d{1,2}일|오늘|내일|어제|작년|올해|내년', text)
    for date in dates:
        keywords.add(date.lower())
    
    # 4. 연도 (4자리 숫자)
    years = re.findall(r'\b(19|20)\d{2}\b', text)
    for year in years:
        keywords.add(year)
    
    # 5. 팀명/리그명 키워드 (축구 관련)
    team_keywords = [
        "토트넘", "아스널", "맨시티", "리버풀", "첼시", "맨유", "바르셀로나", "레알마드리드",
        "tottenham", "arsenal", "manchester", "city", "liverpool", "chelsea", "barcelona", "real madrid",
        "프리미어리그", "라리가", "세리에", "분데스리가", "리그앙",
        "premier league", "la liga", "serie a", "bundesliga", "ligue 1"
    ]
    for keyword in team_keywords:
        if keyword.lower() in text_lower:
            keywords.add(keyword.lower())
    
    # 6. 선수 이름 패턴 (영문: First Last, 한글: 2-3글자)
    # 영문 이름은 이미 proper_nouns_en에서 처리됨
    # 한글 이름은 korean_names에서 처리됨
    
    # 7. 중요한 명사 (3글자 이상 영문 단어, 2글자 이상 한글 단어)
    # 단, 일반적인 조사/접속사 제외
    stopwords = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
        "은", "는", "이", "가", "을", "를", "의", "와", "과", "에서", "에게", "로", "으로"
    }
    
    # 영문 단어 (3글자 이상)
    english_words = re.findall(r'\b[a-z]{3,}\b', text_lower)
    for word in english_words:
        if word not in stopwords:
            keywords.add(word)
    
    # 한글 단어 (2글자 이상, 조사 제외)
    korean_words = re.findall(r'[가-힣]{2,}', text)
    for word in korean_words:
        if word not in stopwords:
            keywords.add(word)
    
    return keywords


def calculate_keyword_match(query: str, cached_answer: str) -> float:
    """
    Query와 Cached Answer 간 Keyword 매칭 점수 계산
    
    제민의 제안 2: 하이브리드 검색
    - 핵심 키워드가 없으면 Judge 없이 바로 API 호출
    - Keyword 점수 < 0.5면 Judge 스킵
    
    Args:
        query: 사용자 질문
        cached_answer: 캐시된 답변
    
    Returns:
        Keyword 매칭 점수 (0.0 ~ 1.0)
        - 1.0: 모든 핵심 키워드 일치
        - 0.5: 절반 정도 일치
        - 0.0: 핵심 키워드 없음 또는 전혀 불일치
    
    Example:
        >>> calculate_keyword_match("손흥민 최근 폼은?", "손흥민은 최근 3골을 기록했습니다")
        0.8  # "손흥민" 키워드 일치
    """
    try:
        query_keywords = extract_keywords(query)
        answer_keywords = extract_keywords(cached_answer)
        
        if not query_keywords:
            # 질문에 핵심 키워드가 없으면 중립 (0.5)
            logger.debug("🔍 질문에 핵심 키워드 없음 → 중립 점수 (0.5)")
            return 0.5
        
        # 교집합 계산
        matched_keywords = query_keywords & answer_keywords
        total_query_keywords = len(query_keywords)
        
        if total_query_keywords == 0:
            return 0.5
        
        # 매칭 비율 계산
        match_ratio = len(matched_keywords) / total_query_keywords
        
        # 가중치 적용: 핵심 키워드(고유명사, 날짜)에 더 높은 가중치
        core_keywords_query = {
            kw for kw in query_keywords 
            if any([
                re.match(r'^[가-힣]{2,4}$', kw),  # 한글 이름
                re.match(r'^[a-z]+(?:\s+[a-z]+)+$', kw),  # 영문 이름
                re.match(r'\d{4}', kw),  # 연도
                kw in ["토트넘", "아스널", "맨시티", "리버풀", "첼시", "맨유", "바르셀로나", "레알마드리드",
                      "tottenham", "arsenal", "manchester", "city", "liverpool", "chelsea"]
            ])
        }
        
        core_matched = core_keywords_query & answer_keywords
        core_ratio = len(core_matched) / len(core_keywords_query) if core_keywords_query else 0
        
        # 최종 점수: 일반 매칭 비율 + 핵심 키워드 가중치
        final_score = (match_ratio * 0.6) + (core_ratio * 0.4)
        
        logger.debug(
            f"🔍 Keyword 매칭: {len(matched_keywords)}/{total_query_keywords} "
            f"(핵심: {len(core_matched)}/{len(core_keywords_query)}) "
            f"→ 점수: {final_score:.2f}"
        )
        
        return final_score
        
    except Exception as e:
        logger.warning(f"⚠️ Keyword 매칭 계산 실패: {e}")
        # 오류 시 중립 점수 반환
        return 0.5


def should_skip_judge_by_keyword(keyword_score: float, threshold: float = 0.5) -> bool:
    """
    Keyword 점수 기반 Judge 호출 스킵 여부 판단
    
    제민의 제안: 핵심 키워드가 없으면 Judge 없이 바로 API 호출
    
    Args:
        keyword_score: Keyword 매칭 점수 (0.0 ~ 1.0)
        threshold: 임계값 (기본값: 0.5)
    
    Returns:
        True: Judge 스킵, 바로 API 호출
        False: Judge 호출 필요
    
    Example:
        >>> should_skip_judge_by_keyword(0.3)  # 키워드 매칭 낮음
        True  # Judge 스킵, API 호출
        >>> should_skip_judge_by_keyword(0.7)  # 키워드 매칭 높음
        False  # Judge 호출
    """
    if keyword_score < threshold:
        logger.info(
            f"🔍 Keyword 점수 낮음 ({keyword_score:.2f} < {threshold}) "
            f"→ Judge 스킵, API 호출"
        )
        return True
    return False

