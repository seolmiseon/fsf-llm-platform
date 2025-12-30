"""
질문 분류 유틸리티
단순 질문 vs 복잡한 질문 판단

비용 최적화 목적:
- 단순 질문: chat.py 사용 (LLM 1회 호출) → 저렴
- 복잡한 질문: Agent 사용 (LLM 2회 호출) → 비싸지만 정확

임베딩 기반 유사도 검색 방식 (RAG 파이프라인 활용):
- ChromaDB에 분류된 질문들을 저장 (질문 + is_complex 결과)
- 새로운 질문이 오면 ChromaDB에서 유사 질문 검색
- 유사도가 높으면 그 분류 결과 재사용
- 유사도가 낮으면 정규식/LLM fallback
- 하드코딩 없이 실제 사용자 질문들이 누적되어 학습됨
"""
import re
import logging
from typing import Optional, Literal
import hashlib
import os

logger = logging.getLogger(__name__)

# 질문 분류 결과 캐시 (메모리 기반, 간단하게)
_question_classification_cache: dict[str, tuple[bool, float]] = {}
CACHE_TTL_SECONDS = 86400  # 24시간

# ChromaDB RAG 서비스 (질문 분류용)
_classification_rag = None


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
    """결과를 메모리 캐시에 저장"""
    import time
    cache_key = _get_cache_key(query)
    _question_classification_cache[cache_key] = (result, time.time())
    logger.debug(f"💾 질문 분류 결과 메모리 캐시 저장: {query[:50]}")


async def _cache_and_save_result(query: str, result: bool):
    """결과를 메모리 캐시와 ChromaDB에 모두 저장"""
    _cache_result(query, result)
    await _save_classified_question(query, result)


def _get_classification_rag():
    """ChromaDB RAG 서비스 초기화 (질문 분류용)"""
    global _classification_rag
    if _classification_rag is None:
        try:
            from ..services.rag_service import RAGService
            _classification_rag = RAGService(persist_directory="chroma_db_classification")
            logger.info("✅ 질문 분류용 ChromaDB 초기화 완료")
        except Exception as e:
            logger.warning(f"⚠️ 질문 분류용 ChromaDB 초기화 실패: {e}")
            _classification_rag = None
    return _classification_rag


async def _search_similar_classified_question(query: str) -> Optional[bool]:
    """
    ChromaDB에서 유사한 분류된 질문 검색
    
    Returns:
        bool: 분류 결과 (True=복잡, False=단순) 또는 None (검색 실패)
    """
    rag = _get_classification_rag()
    if not rag:
        return None
    
    try:
        results = rag.search(
            collection_name="classified_questions",
            query=query,
            top_k=1
        )
        
        if not results.get("ids") or len(results["ids"]) == 0:
            return None
        
        # 유사도 계산
        distance = results.get("distances", [1.0])[0]
        similarity = 1 - distance
        
        # 유사도 임계값 (0.75 이상이면 사용)
        SIMILARITY_THRESHOLD = float(os.getenv("CLASSIFICATION_SIMILARITY_THRESHOLD", "0.75"))
        
        if similarity >= SIMILARITY_THRESHOLD:
            # metadata에서 is_complex 값 가져오기
            metadata = results.get("metadatas", [{}])[0]
            is_complex = metadata.get("is_complex", False)
            logger.debug(f"🔍 유사 질문 발견 (유사도: {similarity:.2f}): {results.get('documents', [''])[0][:50]} → {'복잡' if is_complex else '단순'}")
            return is_complex
        
        return None
        
    except Exception as e:
        logger.warning(f"⚠️ 유사 질문 검색 실패: {e}")
        return None


async def _save_classified_question(query: str, is_complex: bool):
    """분류된 질문을 ChromaDB에 저장"""
    rag = _get_classification_rag()
    if not rag:
        return
    
    try:
        query_hash = hashlib.md5(query.lower().strip().encode()).hexdigest()
        doc_id = f"classification_{query_hash}"
        
        rag.add_documents(
            collection_name="classified_questions",
            documents=[query],
            metadatas=[{
                "is_complex": is_complex,
                "query": query[:300],
                "created_at": str(hashlib.md5(query.encode()).hexdigest())
            }],
            ids=[doc_id]
        )
        logger.debug(f"💾 분류된 질문 저장: {query[:50]} → {'복잡' if is_complex else '단순'}")
    except Exception as e:
        logger.warning(f"⚠️ 분류된 질문 저장 실패: {e}")


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
    # 1단계: 메모리 캐시 확인 (비용 $0)
    cached_result = _get_cached_result(query)
    if cached_result is not None:
        return cached_result
    
    # 2단계: ChromaDB에서 유사한 분류된 질문 검색 (비용 $0, 임베딩 검색)
    similar_result = await _search_similar_classified_question(query)
    if similar_result is not None:
        _cache_result(query, similar_result)
        return similar_result
    
    query_lower = query.lower()
    
    # 2단계: 정규식 기반 빠른 판단 (비용 $0)
    # 1. 여러 작업 요청 키워드
    multi_action_keywords = [
        "그리고", "또한", "또", "그리고도", "동시에",
        "and", "also", "plus", "또한"
    ]
    if any(keyword in query_lower for keyword in multi_action_keywords):
        logger.debug("🔍 복잡한 질문 감지: 여러 작업 요청")
        result = True
        _cache_result(query, result)
        await _save_classified_question(query, result)
        return result
    
    # 1-1. 동사+접속사 패턴 감지 (강화 버전) ⭐
    # "알려주고 ~도", "보여주고 ~도" 같은 실제 소비자 질문 패턴
    # 예: "손흥민 정보 알려주고 최근 경기도 보여줘"
    verb_connector_keywords = ["알려주고", "보여주고", "알려줘", "보여줘", "알려주면서", "보여주면서"]
    connector_keywords = ["도", "또", "그리고", "또한"]
    
    # "알려주고/보여주고" + "도/또/그리고" 조합 감지
    has_verb_connector = any(keyword in query_lower for keyword in verb_connector_keywords)
    has_connector = any(keyword in query_lower for keyword in connector_keywords)
    
    if has_verb_connector and has_connector:
        # "알려주고" 뒤에 "도"가 있는지 확인 (순서 무관)
        # 예: "정보 알려주고 경기도" 또는 "경기도 알려주고"
        logger.debug("🔍 복잡한 질문 감지: 동사+접속사 패턴 (여러 작업 요청)")
        result = True
        _cache_result(query, result)
        await _save_classified_question(query, result)
        return result
    
    # 추가: "~하고 ~도" 패턴 (더 포괄적으로)
    # 예: "분석하고 통계도", "비교하고 경기도"
    if re.search(r'(하고|해주고|해줘).*?(도|또|그리고)', query_lower):
        logger.debug("🔍 복잡한 질문 감지: ~하고 ~도 패턴")
        result = True
        _cache_result(query, result)
        await _save_classified_question(query, result)
        return result
    
    # 2. 경기 ID 패턴 (숫자로만 이루어진 경기 ID)
    match_id_pattern = r'\b\d{6,}\b'  # 6자리 이상 숫자
    if re.search(match_id_pattern, query):
        logger.debug("🔍 복잡한 질문 감지: 경기 ID 포함")
        _cache_result(query, True)
        return True
    
    # 3. 비교 질문 감지 (선수/팀/리그 등 모든 비교)
    # 3-1. 비교 의도 표현 감지 (키워드 없이도 비교 의도 표현)
    comparison_intent_keywords = [
        "누가 더", "어느 쪽이", "어느 게", "어느 것이", "어느 팀이",
        "누가 나아요", "누가 좋아요", "누가 더 나아요", "누가 더 좋아요",
        "어느 게 나아요", "어느 게 좋아요", "어느 쪽이 나아요", "어느 쪽이 좋아요"
    ]
    if any(keyword in query_lower for keyword in comparison_intent_keywords):
        # 비교 의도 표현이 있고, 두 개 이상의 고유명사/팀명이 있으면 비교 질문
        entity_pattern = r'[가-힣]{2,6}(?:리그)?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}'
        matches = re.findall(entity_pattern, query)
        unique_matches = [m.strip() for m in matches if m.strip() and len(m.strip()) >= 2]
        
        if len(set(unique_matches)) >= 2:
            logger.debug("🔍 복잡한 질문 감지: 비교 의도 표현 발견")
            _cache_result(query, True)
            return True
    
    # 3-2. 축약형 비교 질문 감지 ("A B" 형식, vs 키워드 없음)
    # 예: "맨유 토트넘", "손흥민 홀란드"
    # ⚠️ 주의: 질문 형식(?, 는, 은 등)이 있으면 비교가 아님
    # ⚠️ 주의: 일반 단어(최근, 폼, 정보 등)가 있으면 비교가 아님
    
    # 질문 형식 감지 (질문 형식이 있으면 비교가 아님)
    question_markers = ['?', '는', '은', '이', '가', '을', '를', '의', '에', '에서', '에게', '에게서']
    has_question_marker = any(marker in query for marker in question_markers)
    
    # 일반 단어 제외 목록 (비교 질문으로 오인하면 안 되는 단어들)
    exclude_words = [
        '최근', '폼', '정보', '순위', '결과', '점수', '경기', '일정', '스케줄',
        '전적', '통계', '득점', '어시스트', '나이', '소속', '팀', '리그',
        '우승', '감독', '홈구장', '팬', '횟수', '시즌', '시작일', '날짜',
        'recent', 'form', 'info', 'rank', 'result', 'score', 'match', 'schedule'
    ]
    
    # 질문 형식이 없고, 일반 단어도 없을 때만 축약형 비교 감지
    if not has_question_marker:
        words = query.split()
        
        # 연속된 두 단어가 모두 고유명사/팀명인지 확인
        for i in range(len(words) - 1):
            word1, word2 = words[i], words[i + 1]
            
            # 일반 단어 제외
            if word1.lower() in exclude_words or word2.lower() in exclude_words:
                continue
            
            # 고유명사/팀명 패턴 (한글 2-4자 또는 영문 대문자 시작)
            is_entity1 = re.match(r'^[가-힣]{2,4}$', word1) or re.match(r'^[A-Z][a-z]+$', word1)
            is_entity2 = re.match(r'^[가-힣]{2,4}$', word2) or re.match(r'^[A-Z][a-z]+$', word2)
            
            # 두 단어가 모두 고유명사/팀명이고, 비교 키워드가 없으면 축약형 비교 질문
            if is_entity1 and is_entity2:
                if not any(kw in query_lower for kw in ["vs", "대", "비교", "compare", "versus", "와", "과", "누가", "어느"]):
                    logger.debug("🔍 복잡한 질문 감지: 축약형 비교 질문 (A B 형식)")
                    _cache_result(query, True)
                    return True
    
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
        "알려주고", "알려주면서", "알려줘 그리고",  # 추가
        "비교하고", "비교 후", "비교해서",
        "analyze and", "compare and", "show and"
    ]
    if any(keyword in query_lower for keyword in complex_keywords):
        logger.debug("🔍 복잡한 질문 감지: 복합 작업 키워드")
        _cache_result(query, True)
        return True
    
    # 4-1. "~하고 ~도" 패턴 감지 (정규식으로 더 정교하게)
    # 예: "정보 알려주고 경기도 보여줘", "분석하고 통계도 알려줘"
    multi_action_pattern = r'(.+?)(하고|해주고|해줘|후|후에).*?(도|또|그리고).*?(보여줘|알려줘|보여주고|알려주고|분석|비교|통계)'
    if re.search(multi_action_pattern, query_lower):
        logger.debug("🔍 복잡한 질문 감지: 여러 작업 요청 패턴")
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
    # 단, "경기 결과", "경기 점수" 같은 키워드가 있으면 단순 질문 (일정이 아닌 결과 조회)
    result_keywords = ["경기 결과", "경기 점수", "경기 스코어", "경기 승부", "match result", "score"]
    if any(keyword in query_lower for keyword in result_keywords):
        logger.debug("✅ 경기 결과 조회 → 단순 질문으로 처리")
        _cache_result(query, False)
        return False
    
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
            
            # 분류 결과를 ChromaDB에 저장 (다음에 유사 질문이 오면 재사용)
            await _save_classified_question(query, is_complex)
            
            return is_complex
            
        except Exception as e:
            logger.warning(f"⚠️ LLM 질문 분류 실패: {e}, 기본값(단순) 사용")
            _cache_result(query, False)
            return False
    
    # 기본값: 단순 질문
    logger.debug("✅ 단순 질문으로 판단")
    result = False
    _cache_result(query, result)
    
    # 분류 결과를 ChromaDB에 저장 (다음에 유사 질문이 오면 재사용)
    await _save_classified_question(query, result)
    
    return result
