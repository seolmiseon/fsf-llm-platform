"""
경기 분석 프롬프트 템플릿

📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
🔗 참고: Advanced Prompting - Few-shot examples

특정 경기에 대한 상세 분석, 주요 장면, 통계 분석 프롬프트
"""

# ============================================
# 1. 경기 분석 시스템 프롬프트
# ============================================

MATCH_ANALYSIS_SYSTEM_PROMPT = """당신은 전문적인 축구 경기 분석가입니다.

역할:
- 축구 경기를 심층적으로 분석
- 데이터 기반의 객관적 평가 제시
- 경기의 핵심 전개 설명
- 선수 개개인의 활약 평가

분석 스타일:
1. 먼저 경기의 큰 흐름을 설명
2. 구체적인 통계로 뒷받침
3. 주요 선수의 활약 언급
4. 코칭 전술 분석 (가능시)
5. 경기 결과에 영향을 미친 요소들

정보 정확성:
- 제공된 데이터만 사용
- 추측은 최소화
- 명확한 출처 표시
- 불확실한 부분은 명시

톤:
- 전문적이면서도 접근 가능
- 축구 팬들이 이해할 수 있는 표현
- 필요시 이모지 활용
"""

# ============================================
# 2. 경기 분석 상세 프롬프트
# ============================================

MATCH_ANALYSIS_DETAILED_PROMPT = """다음 경기를 상세히 분석해주세요.

【경기 정보】
홈 팀: {home_team}
어웨이 팀: {away_team}
최종 스코어: {score}
경기장: {venue}
날짜: {date}
리그: {league}

【경기 통계】
홈 팀:
- 볼 점유율: {home_possession}%
- 슈팅: {home_shots}회 (유효: {home_shots_on_target})
- 패스: {home_passes}회 (성공률: {home_pass_accuracy}%)
- 파울: {home_fouls}회
- 태클: {home_tackles}회

어웨이 팀:
- 볼 점유율: {away_possession}%
- 슈팅: {away_shots}회 (유효: {away_shots_on_target})
- 패스: {away_passes}회 (성공률: {away_pass_accuracy}%)
- 파울: {away_fouls}회
- 태클: {away_tackles}회

【골 정보】
{goals_info}

【경기 분석 항목】
1. 경기의 흐름 및 전술
   - 각 팀의 포지셔닝
   - 점유율을 어떻게 활용했는가
   - 주도권이 어떻게 변했는가

2. 공격 분석
   - 어떤 방식으로 골을 만들었는가
   - 위험한 찬스는 몇 번인가
   - 슈팅 효율성

3. 수비 분석
   - 실점 원인
   - 수비 라인의 안정성
   - 골키퍼 활약

4. 주요 선수 평가
   - MVP 선정
   - 두각을 나타낸 선수
   - 부진한 선수

5. 경기 결과 결정 요소
   - 승리팀의 승인: 왜 이겼는가
   - 패배팀의 아쉬운 점: 뭐가 부족했는가

【응답 포맷】
최대 500단어 이내로 정리해주세요.
구조:
- [경기 요약] (1-2문장)
- [경기 흐름 분석] (2-3문장)
- [핵심 통계 해석] (리스트)
- [주요 선수] (MVP 포함)
- [경기 결과 영향 요소] (왜 이 결과가 나왔는가)
"""

MATCH_ANALYSIS_BRIEF_PROMPT = """다음 경기를 간단히 분석해주세요.

【경기 정보】
{home_team} vs {away_team}
최종 스코어: {score}

【핵심 통계】
{key_stats}

【주요 골 정보】
{goals_info}

분석 (100단어 이내):
1. 경기 결과를 결정한 가장 중요한 요소
2. MVP 선수 1명과 이유
3. 경기의 한 문장 요약

간결하고 핵심만 전달해주세요."""

# ============================================
# 3. 특정 분석 프롬프트
# ============================================

TACTICAL_ANALYSIS_PROMPT = """다음 경기의 전술을 분석해주세요.

【팀 포메이션】
{home_team}: {home_formation}
{away_team}: {away_formation}

【경기 통계】
{match_stats}

【전술 분석 항목】
1. 각 팀이 선택한 포메이션의 의도
2. 상대를 고려한 전술 선택
3. 경기 진행 중 전술 변화
4. 전술의 성공/실패 요인
5. 향후 개선 방향 (만약 다시 한다면)

전문적이고 깊이 있는 분석을 부탁합니다."""

PLAYER_PERFORMANCE_ANALYSIS_PROMPT = """다음 경기에서 {player_name}의 활약을 분석해주세요.

【선수 정보】
이름: {player_name}
팀: {team}
포지션: {position}
등번: {number}

【경기 데이터】
- 출전 시간: {minutes_played}분
- 슈팅: {shots}회 (정확도: {shot_accuracy}%)
- 패스: {passes}회 (성공률: {pass_accuracy}%)
- 키 패스: {key_passes}회
- 태클: {tackles}회
- 인터셉트: {intercepts}회
- 골: {goals}회
- 도움: {assists}회

【주요 활약】
{highlights}

분석 항목:
1. 경기에서의 역할 수행 정도
2. 강점과 약점
3. 전반/후반 활약 비교
4. 팀에 미친 영향
5. 평점 (10점 만점)

객관적이고 균형잡힌 평가를 부탁합니다."""

# ============================================
# 4. 예측/인사이트 프롬프트
# ============================================

MATCH_INSIGHT_PROMPT = """다음 경기에서 주목할 포인트들을 제시해주세요.

【경기 정보】
{home_team} vs {away_team}
날짜: {date}

【팀 정보】
{team_info}

【주목할 포인트】
1. 양팀의 전력 비교
2. 경기에 영향을 미칠 수 있는 부상자/결장자
3. 최근 폼의 영향
4. 직접 대면 전적 분석
5. 예상 경기 흐름

재미있으면서도 정보성 있는 인사이트를 제공해주세요."""

# ============================================
# 5. 주요 장면 설명 프롬프트
# ============================================

KEY_MOMENTS_PROMPT = """다음 경기의 주요 장면들을 설명해주세요.

【경기 정보】
{match_info}

【주요 장면】
{moments}

각 장면에 대해:
1. 무슨 일이 일어났는가
2. 왜 중요한 순간인가
3. 경기 흐름에 미친 영향

시간 순서대로 스토리를 짜서 설명해주세요."""

# ============================================
# 6. 비교 분석 프롬프트
# ============================================

HEAD_TO_HEAD_ANALYSIS_PROMPT = """두 팀의 경기 역사를 분석해주세요.

【팀 1】
{team1}: 전적 {team1_record} (승-무-패)
최근 경기: {team1_recent}

【팀 2】
{team2}: 전적 {team2_record} (승-무-패)
최근 경기: {team2_recent}

【분석 항목】
1. 역사적 우위
2. 최근 경향
3. 예상되는 경기 결과
4. 경기를 결정할 요소

데이터 기반으로 객관적 분석을 부탁합니다."""

# ============================================
# 7. 응답 포맷 템플릿
# ============================================

MATCH_ANALYSIS_RESPONSE_FORMAT = """
**[경기 결과]**
{home_team} {score} {away_team}

---

**📊 경기 요약**
[1-2문장으로 경기의 흐름 설명]

**⚽ 핵심 통계**
- 점유율: {home_team} {home_possession}% vs {away_team} {away_possession}%
- 슈팅: {home_shots} vs {away_shots} (유효: {home_sot} vs {away_sot})
- 패스 성공률: {home_pass}% vs {away_pass}%

**🎯 골 장면**
{goals_breakdown}

**🏆 주요 선수**
- MVP: {mvp}
- 돋보인 선수: {standout_players}
- 아쉬운 선수: {disappointing_players}

**💡 경기 분석**
{detailed_analysis}

**📈 결과 평가**
{verdict}

🔗 **출처**: Football-Data.org API
"""

# ============================================
# 8. 유틸리티 함수
# ============================================

def get_match_analysis_prompt(
    home_team: str,
    away_team: str,
    score: str,
    stats: dict,
    goals_info: str,
    detail_level: str = "standard"
) -> str:
    """
    경기 분석 프롬프트 생성
    
    📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
    🔗 참고: Few-shot prompting
    
    Args:
        home_team: 홈 팀명
        away_team: 어웨이 팀명
        score: 최종 스코어
        stats: 경기 통계 딕셔너리
        goals_info: 골 정보
        detail_level: 분석 상세도 (brief/standard/detailed)
    
    Returns:
        생성된 프롬프트
    """
    if detail_level == "brief":
        return MATCH_ANALYSIS_BRIEF_PROMPT.format(
            home_team=home_team,
            away_team=away_team,
            score=score,
            key_stats=_format_key_stats(stats),
            goals_info=goals_info
        )
    else:
        return MATCH_ANALYSIS_DETAILED_PROMPT.format(
            home_team=home_team,
            away_team=away_team,
            score=score,
            venue=stats.get("venue", "N/A"),
            date=stats.get("date", "N/A"),
            league=stats.get("league", "N/A"),
            home_possession=stats.get("home_possession", "N/A"),
            home_shots=stats.get("home_shots", "N/A"),
            home_shots_on_target=stats.get("home_shots_on_target", "N/A"),
            home_passes=stats.get("home_passes", "N/A"),
            home_pass_accuracy=stats.get("home_pass_accuracy", "N/A"),
            home_fouls=stats.get("home_fouls", "N/A"),
            home_tackles=stats.get("home_tackles", "N/A"),
            away_possession=stats.get("away_possession", "N/A"),
            away_shots=stats.get("away_shots", "N/A"),
            away_shots_on_target=stats.get("away_shots_on_target", "N/A"),
            away_passes=stats.get("away_passes", "N/A"),
            away_pass_accuracy=stats.get("away_pass_accuracy", "N/A"),
            away_fouls=stats.get("away_fouls", "N/A"),
            away_tackles=stats.get("away_tackles", "N/A"),
            goals_info=goals_info
        )


def get_tactical_analysis_prompt(
    home_team: str,
    away_team: str,
    home_formation: str,
    away_formation: str,
    match_stats: str
) -> str:
    """
    전술 분석 프롬프트 생성
    
    Args:
        home_team: 홈 팀명
        away_team: 어웨이 팀명
        home_formation: 홈 팀 포메이션
        away_formation: 어웨이 팀 포메이션
        match_stats: 경기 통계
    
    Returns:
        생성된 프롬프트
    """
    return TACTICAL_ANALYSIS_PROMPT.format(
        home_team=home_team,
        away_team=away_team,
        home_formation=home_formation,
        away_formation=away_formation,
        match_stats=match_stats
    )


def get_player_performance_prompt(
    player_name: str,
    team: str,
    position: str,
    number: int,
    minutes_played: int,
    stats: dict,
    highlights: str
) -> str:
    """
    선수 활약 분석 프롬프트 생성
    
    Args:
        player_name: 선수명
        team: 팀명
        position: 포지션
        number: 등번
        minutes_played: 출전 시간
        stats: 활약 통계
        highlights: 주요 활약 설명
    
    Returns:
        생성된 프롬프트
    """
    return PLAYER_PERFORMANCE_ANALYSIS_PROMPT.format(
        player_name=player_name,
        team=team,
        position=position,
        number=number,
        minutes_played=minutes_played,
        shots=stats.get("shots", 0),
        shot_accuracy=stats.get("shot_accuracy", 0),
        passes=stats.get("passes", 0),
        pass_accuracy=stats.get("pass_accuracy", 0),
        key_passes=stats.get("key_passes", 0),
        tackles=stats.get("tackles", 0),
        intercepts=stats.get("intercepts", 0),
        goals=stats.get("goals", 0),
        assists=stats.get("assists", 0),
        highlights=highlights
    )


def _format_key_stats(stats: dict) -> str:
    """
    통계를 읽기 쉬운 포맷으로 변환
    
    Args:
        stats: 통계 딕셔너리
    
    Returns:
        포맷된 문자열
    """
    return f"""
홈 팀: 점유율 {stats.get('home_possession', 'N/A')}%, 슈팅 {stats.get('home_shots', 'N/A')}회
어웨이 팀: 점유율 {stats.get('away_possession', 'N/A')}%, 슈팅 {stats.get('away_shots', 'N/A')}회
"""