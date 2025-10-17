"""
챗봇 프롬프트 템플릿 - 분석 및 개선

📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
🔗 참고: OpenAI Best Practices for Prompting

사용자의 축구 질문에 대해 정확하고 친절하게 답변하는 시스템 프롬프트
"""

# ============================================
# 1. 시스템 프롬프트 (System Prompt)
# ============================================

SYSTEM_PROMPT = """당신은 전문적이고 친절한 축구 AI 어시스턴트입니다.

역할:
- 축구 경기, 팀, 선수에 대한 질문에 정확하게 답변
- 최신 경기 결과, 순위표, 선수 통계를 바탕으로 정보 제공
- 축구 분석을 제공할 때 데이터 기반으로 설명

규칙:
1. 한국어로 답변합니다
2. 항상 출처를 명시합니다 (경기 ID, 날짜 등)
3. 불확실한 정보는 "확인할 수 없습니다"라고 명시
4. 친근하고 캐주얼한 톤 유지
5. 필요시 이모지를 적절히 사용
6. 긴 답변은 구조화된 포맷으로 제시 (제목, 리스트 등)

질문 분류:
- 선수 폼: "손흥민 최근 폼", "홀란드 시즌 통계"
- 팀 분석: "맨시티 이번 시즌", "토트넘 최근 5경기"
- 경기 비교: "맨시티 vs 첼시", "리버풀 vs 맨유"
- 순위/통계: "프리미어리그 순위", "라리가 득점왕"

응답 포맷:
- 직접적인 답변 먼저
- 필요시 추가 정보 (통계, 비교 등)
- 마지막에 출처/데이터 명시
"""

# 챗봇에서 사용할 기본 시스템 프롬프트
CHAT_SYSTEM_PROMPT = SYSTEM_PROMPT

# ============================================
# 2. 세부 분석 프롬프트
# ============================================

PLAYER_FORM_PROMPT = """다음 정보를 바탕으로 선수의 최근 폼을 분석해주세요.

선수명: {player_name}
소속팀: {team}
포지션: {position}

최근 경기 통계:
{stats}

분석 포인트:
1. 최근 골/도움 추이
2. 출전 시간 변화
3. 경기력 평가
4. 현재 폼 상태 (좋음/보통/부진)

친근한 톤으로 간결하게 답변해주세요."""

TEAM_ANALYSIS_PROMPT = """다음 팀의 시즌 분석을 해주세요.

팀명: {team_name}
리그: {league}
시즌: {season}

팀 데이터:
- 순위: {position}
- 전적: {record} (승-무-패)
- 골득실: {goal_diff}
- 최근 5경기: {recent_matches}
- 주요 선수: {key_players}

분석해야 할 부분:
1. 시즌 성적 평가
2. 강점과 약점
3. 최근 5경기 트렌드
4. 상위권 진출 가능성 (있다면)

데이터 기반으로 객관적으로 분석해주세요."""

MATCH_COMPARISON_PROMPT = """두 팀의 경기를 비교 분석해주세요.

홈 팀: {home_team}
어웨이 팀: {away_team}

팀별 정보:
홈 팀:
- 순위: {home_position}
- 최근 폼: {home_form}
- 주요 선수: {home_players}

어웨이 팀:
- 순위: {away_position}
- 최근 폼: {away_form}
- 주요 선수: {away_players}

비교 포인트:
1. 전력 비교
2. 최근 직접 대면 전적 (있다면)
3. 예상되는 경기 양상
4. 주목할 선수 매치업

균형잡힌 분석을 제시해주세요."""

STATISTICS_PROMPT = """다음 통계 정보를 바탕으로 설명해주세요.

통계명: {stat_name}
데이터:
{data}

설명 포인트:
1. 순위 상위권 선수/팀
2. 주목할 만한 점
3. 의외의 결과 (있다면)

간결하고 이해하기 쉽게 설명해주세요."""

# ============================================
# 3. 컨텍스트 추가 프롬프트
# ============================================

CONTEXT_INSTRUCTION = """위 정보를 바탕으로 사용자의 질문에 답변해주세요.

사용자 질문: {user_query}

응답 가이드:
1. 제공된 데이터를 최대한 활용
2. 만약 데이터에 없는 내용이면 "해당 정보는 제공되지 않았습니다"라고 명시
3. 항상 출처와 날짜를 포함
4. 3-5문장으로 간결하게 정리

응답 포맷:
[직접적인 답변]
📊 데이터: [구체적 수치/정보]
🔗 출처: [경기 ID, 날짜 등]"""

# ============================================
# 4. 에러/예외 처리 프롬프트
# ============================================

NO_DATA_RESPONSE = """죄송하지만, 요청하신 정보를 찾을 수 없습니다.

가능한 이유:
- 최근 경기가 없음
- 선수/팀이 존재하지 않음
- 데이터가 업데이트되지 않음

다시 시도할 수 있는 방법:
1. 팀/선수명을 다시 확인해주세요
2. 다른 기간의 정보를 요청해보세요
3. 최근 경기 정보를 요청해보세요 (예: "프리미어리그 최근 경기")

도움이 필요하신가요? 😊"""

CLARIFICATION_PROMPT = """질문이 모호한 것 같습니다. 다시 확인해주세요.

예를 들어:
- 선수 폼: "손흥민 최근 5경기 폼" 또는 "홀란드 이번 시즌 통계"
- 팀 분석: "맨시티 순위" 또는 "토트넘 최근 전적"
- 경기 비교: "맨시티 vs 첼시 누가 더 강한가"
- 순위표: "프리미어리그 현재 순위" 또는 "라리가 상위 5팀"

더 구체적으로 물어봐주시면 정확하게 답변드리겠습니다! 👍"""

# ============================================
# 5. 최종 응답 포맷 템플릿
# ============================================

RESPONSE_FORMAT = """
**[제목]**

[답변 본문 - 2-4문장]

📊 **주요 정보:**
- [포인트 1]
- [포인트 2]
- [포인트 3]

🔗 **출처:**
- 데이터 출처: Football-Data.org API
- 조회 시간: [시간]
- 관련 경기 ID: [ID들]

💡 **팁:**
[추가 정보 또는 관련 질문 제시]
"""

# ============================================
# 6. 유틸리티 함수
# ============================================


def get_system_prompt() -> str:
    """
    시스템 프롬프트 반환

    📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
    🔗 참고: System messages guide

    Returns:
        시스템 프롬프트 문자열
    
    Example:
        >>> prompt = get_system_prompt()
        >>> print(prompt[:50])
        "당신은 전문적이고 친절한 축구 AI 어시스턴트..."
    """
    return SYSTEM_PROMPT


def get_context_prompt(query: str, context_data: str) -> str:
    """
    컨텍스트가 포함된 프롬프트 생성

    📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering/tactic-provide-context
    🔗 권장: Context documents를 먼저 제공

    Args:
        query: 사용자 질문
        context_data: RAG에서 검색된 컨텍스트

    Returns:
        생성된 프롬프트
    
    Example:
        >>> prompt = get_context_prompt(
        ...     "손흥민 폼?",
        ...     "손흥민: 최근 5경기 3골 2도움"
        ... )
    """
    return f"""다음 컨텍스트를 참고하여 질문에 답변해주세요.

【컨텍스트】
{context_data}

【사용자 질문】
{query}

위 컨텍스트를 최대한 활용하여 정확하고 친절하게 답변해주세요."""


def get_player_analysis_prompt(
    player_name: str, team: str, position: str, stats: str
) -> str:
    """
    선수 분석 프롬프트 생성

    Args:
        player_name: 선수명
        team: 팀명
        position: 포지션
        stats: 통계 데이터

    Returns:
        생성된 프롬프트
    
    Example:
        >>> prompt = get_player_analysis_prompt(
        ...     "손흥민", "토트넘", "LW", "5경기 3골 2도움"
        ... )
    """
    return PLAYER_FORM_PROMPT.format(
        player_name=player_name, team=team, position=position, stats=stats
    )


def get_team_analysis_prompt(
    team_name: str,
    league: str,
    season: str,
    position: int,
    record: str,
    goal_diff: str,
    recent_matches: str,
    key_players: str,
) -> str:
    """
    팀 분석 프롬프트 생성

    Args:
        team_name: 팀명
        league: 리그명
        season: 시즌
        position: 현재 순위
        record: 전적 (승-무-패)
        goal_diff: 골득실
        recent_matches: 최근 경기 결과
        key_players: 주요 선수

    Returns:
        생성된 프롬프트
    """
    return TEAM_ANALYSIS_PROMPT.format(
        team_name=team_name,
        league=league,
        season=season,
        position=position,
        record=record,
        goal_diff=goal_diff,
        recent_matches=recent_matches,
        key_players=key_players,
    )


def get_match_comparison_prompt(
    home_team: str,
    away_team: str,
    home_position: int,
    away_position: int,
    home_form: str,
    away_form: str,
    home_players: str,
    away_players: str,
) -> str:
    """
    경기 비교 분석 프롬프트 생성

    Args:
        home_team: 홈 팀명
        away_team: 어웨이 팀명
        home_position: 홈 팀 순위
        away_position: 어웨이 팀 순위
        home_form: 홈 팀 최근 폼
        away_form: 어웨이 팀 최근 폼
        home_players: 홈 팀 주요 선수
        away_players: 어웨이 팀 주요 선수

    Returns:
        생성된 프롬프트
    """
    return MATCH_COMPARISON_PROMPT.format(
        home_team=home_team,
        away_team=away_team,
        home_position=home_position,
        away_position=away_position,
        home_form=home_form,
        away_form=away_form,
        home_players=home_players,
        away_players=away_players,
    )


def format_chat_context(sources: list) -> str:
    """
    RAG 검색 결과를 프롬프트 컨텍스트로 포맷팅

    📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering/tactic-provide-context
    🔗 권장: 구조화된 포맷으로 컨텍스트 제공

    Args:
        sources: RAG 검색 결과 리스트
            [
                {
                    "id": "match_123",
                    "content": "Arsenal 3-1 Chelsea",
                    "metadata": {"team": "Arsenal", "date": "2024-10-17"},
                    "similarity": 0.95
                },
                ...
            ]

    Returns:
        포맷팅된 컨텍스트 문자열
    
    Example:
        >>> sources = [{
        ...     "id": "match_1",
        ...     "content": "Arsenal 3-1 Chelsea",
        ...     "metadata": {"date": "2024-10-17"},
        ...     "similarity": 0.95
        ... }]
        >>> context = format_chat_context(sources)
        >>> print(context)
        "[출처 1]
         Arsenal 3-1 Chelsea
         메타데이터: date: 2024-10-17, similarity: 0.95"
    """
    if not sources:
        return "현재 사용 가능한 데이터가 없습니다."

    context_parts = []

    for i, source in enumerate(sources, 1):
        content = source.get("content", "")
        metadata = source.get("metadata", {})
        similarity = source.get("similarity", 0)

        part = f"[출처 {i}]\n{content}"

        # 메타데이터 추가
        meta_items = []
        if metadata:
            for k, v in metadata.items():
                meta_items.append(f"{k}: {v}")
        
        if similarity > 0:
            meta_items.append(f"유사도: {similarity:.2%}")
        
        if meta_items:
            meta_str = ", ".join(meta_items)
            part += f"\n메타데이터: {meta_str}"

        context_parts.append(part)

    return "\n\n".join(context_parts)