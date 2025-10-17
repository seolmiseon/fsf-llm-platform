"""
선수 비교 분석 프롬프트 템플릿

📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
🔗 참고: Chain-of-thought prompting for complex analysis

두 선수를 비교 분석하는 프롬프트
"""

# ============================================
# 1. 선수 비교 시스템 프롬프트
# ============================================

PLAYER_COMPARISON_SYSTEM_PROMPT = """당신은 전문적인 축구 선수 분석가입니다.

역할:
- 두 선수를 객관적으로 비교
- 데이터 기반의 평가 제시
- 강점과 약점을 명확히 구분
- 포지션과 역할을 고려한 분석

분석 철학:
1. 절대적 우위가 아닌 "어떤 상황에서 누가 더 나은가"로 분석
2. 리그, 팀, 포지션의 차이를 고려
3. 개인 능력과 팀 기여도를 구분
4. 시즌 전체 추이를 반영

객관성 유지:
- 팬심이나 인기도 제외
- 국적이나 리그에 편견 없음
- 제공된 데이터만 사용
- 불확실한 평가는 명시

톤:
- 전문적이고 균형잡힘
- 두 선수를 공평하게 대우
- 이해하기 쉬운 표현
"""

# ============================================
# 2. 상세 비교 프롬프트
# ============================================

PLAYER_COMPARISON_DETAILED_PROMPT = """다음 두 선수를 상세히 비교해주세요.

【선수 1】
이름: {player1_name}
팀: {player1_team}
국가: {player1_country}
포지션: {player1_position}
나이: {player1_age}
시즌: {season}

활약 통계:
- 경기: {player1_matches}회
- 골: {player1_goals}회
- 도움: {player1_assists}회
- 슈팅: {player1_shots}회 (정확도: {player1_shot_accuracy}%)
- 패스: {player1_passes}회 (성공률: {player1_pass_accuracy}%)
- 태클: {player1_tackles}회
- 인터셉트: {player1_intercepts}회
- 평균 평점: {player1_rating}점

특징: {player1_characteristics}

【선수 2】
이름: {player2_name}
팀: {player2_team}
국가: {player2_country}
포지션: {player2_position}
나이: {player2_age}
시즌: {season}

활약 통계:
- 경기: {player2_matches}회
- 골: {player2_goals}회
- 도움: {player2_assists}회
- 슈팅: {player2_shots}회 (정확도: {player2_shot_accuracy}%)
- 패스: {player2_passes}회 (성공률: {player2_pass_accuracy}%)
- 태클: {player2_tackles}회
- 인터셉트: {player2_intercepts}회
- 평균 평점: {player2_rating}점

특징: {player2_characteristics}

【비교 분석】

1. 득점력 비교
   - 슈팅 수와 골 결정력
   - 골 타이밍과 유형

2. 플레이메이킹 능력
   - 도움 수
   - 키 패스
   - 팀 플레이 기여도

3. 피지컬 능력
   - 스피드와 민첩성 (평점을 통한 추정)
   - 피지컬 수치 (태클, 인터셉트)

4. 포지션별 역할 수행
   - 포지션 특성에 맞는 수행도
   - 수비 vs 공격 균형

5. 일관성
   - 시즌 전체 활약 안정성
   - 부상이나 결장 여부

6. 리그와 팀의 영향
   - 리그 난이도 차이 고려
   - 팀의 전술과 풍격

【결론】

각 항목별 우위:
- {category1}: {player} 우위
- {category2}: {player} 우위
- ...

최종 평가:
- 더 나은 선수는?
- 각자의 최고 강점은?
- 약점과 개선 과제는?
- "누가 더 나은가"가 아닌 "상황에 따라 어떻게 다른가"를 설명
"""

PLAYER_COMPARISON_BRIEF_PROMPT = """두 선수를 간단히 비교해주세요.

【선수 비교】
{player1_name} vs {player2_name}

【주요 통계】
{stats_comparison}

간단한 분석 (100단어 이내):
1. 가장 큰 강점 비교
2. 주목할 차이점
3. 상황별 선택 기준

최대한 간결하게 정리해주세요."""

# ============================================
# 3. 포지션별 비교 프롬프트
# ============================================

FORWARD_COMPARISON_PROMPT = """다음 두 공격수를 비교해주세요.

【선수 정보】
{player1_info}
{player2_info}

【공격수 평가 기준】
1. 골 결정력
   - 슈팅 정확도
   - 위치선정 능력
   - 클러치 골 여부

2. 플레이메이킹
   - 도움
   - 팀 플레이 기여도
   - 시야와 판단력

3. 피지컬
   - 스피드
   - 볼 컨트롤
   - 경합 능력

4. 포지셔닝
   - 스페이스 인식
   - 움직임의 질

누가 더 완성된 공격수인가? 각 선수의 특장점은?"""

MIDFIELDER_COMPARISON_PROMPT = """다음 두 미드필더를 비교해주세요.

【선수 정보】
{player1_info}
{player2_info}

【미드필더 평가 기준】
1. 공격 임무 수행
   - 골 직전 패스
   - 시야와 판단
   - 템포 조절

2. 수비 임무 수행
   - 태클과 인터셉트
   - 포지셔닝
   - 압박의 질

3. 볼 소유
   - 패스 성공률
   - 드리블
   - 볼 탈취

4. 경기 컨트롤
   - 경기 주도권
   - 팀 플레이

누가 더 다재다능한 미드필더인가?"""

DEFENDER_COMPARISON_PROMPT = """다음 두 수비수를 비교해주세요.

【선수 정보】
{player1_info}
{player2_info}

【수비수 평가 기준】
1. 피지컬 능력
   - 스피드와 민첩성
   - 점프력과 경합
   - 강인함

2. 포지셔닝
   - 라인 유지
   - 스페이스 커버
   - 예측 능력

3. 택티컬 능력
   - 슬라이딩 타이밍
   - 상황 판단
   - 부상당한 선수 대체 능력

4. 패스 빌드업
   - 정확도
   - 시야
   - 공격 시작 역할

누가 더 안정적인 수비수인가?"""

# ============================================
# 4. 특정 관점 프롬프트
# ============================================

OFFENSIVE_CAPABILITY_PROMPT = """다음 두 선수의 공격 능력을 비교해주세요.

【선수 데이터】
{player1_data}
{player2_data}

【공격 능력 분석】
1. 슈팅 능력
2. 골 결정력 (골/슈팅 비율)
3. 수치화된 기대 골 (xG) 성능
4. 클러치 상황 골
5. 헤더, 롱슈팅 등 다양한 방식의 득점

공격 능력만 순순히 비교했을 때 누가 더 나은가?"""

PLAYMAKING_CAPABILITY_PROMPT = """다음 두 선수의 플레이메이킹 능력을 비교해주세요.

【선수 데이터】
{player1_data}
{player2_data}

【플레이메이킹 분석】
1. 도움 수
2. 키 패스 (결정적 패스)
3. 패스 정확도
4. 패스 난이도 (롱패스, 크로스 등)
5. 팀 플레이 기여도
6. 시야와 판단력

플레이메이킹만 놓고 봤을 때 누가 더 뛰어난가?"""

DEFENSIVE_CAPABILITY_PROMPT = """다음 두 선수의 수비 능력을 비교해주세요.

【선수 데이터】
{player1_data}
{player2_data}

【수비 능력 분석】
1. 태클 수와 성공률
2. 인터셉트
3. 클리어런스
4. 포지셔닝
5. 압박 강도
6. 수비 오류로 인한 실점

수비만 놓고 봤을 때 누가 더 효과적인가?"""

# ============================================
# 5. 시즌 흐름 비교 프롬프트
# ============================================

SEASON_FORM_COMPARISON_PROMPT = """두 선수의 시즌 폼 변화를 비교해주세요.

【월별 활약】
{player1_monthly_data}
{player2_monthly_data}

【분석 항목】
1. 시즌 초반 vs 중반 vs 후반 폼
2. 최고조와 저점
3. 부상이나 결장의 영향
4. 전술 변화에 따른 반응
5. 압박에서의 안정성

누가 더 일관성 있는 성과를 냈는가?
누가 더 크게 성장했는가?"""

# ============================================
# 6. 응답 포맷 템플릿
# ============================================

PLAYER_COMPARISON_RESPONSE_FORMAT = """
**[선수 비교: {player1_name} vs {player2_name}]**

---

**📊 기본 정보**
| 항목 | {player1_name} | {player2_name} |
|------|---|---|
| 팀 | {p1_team} | {p2_team} |
| 포지션 | {p1_pos} | {p2_pos} |
| 나이 | {p1_age} | {p2_age} |
| 시즌 경기 | {p1_matches} | {p2_matches} |

**⚽ 공격 능력**
- 골: {p1_goals}회 vs {p2_goals}회
- 도움: {p1_assists}회 vs {p2_assists}회
- 슈팅 정확도: {p1_shot_acc}% vs {p2_shot_acc}%
→ {verdict_attack}

**🛡️ 수비 능력**
- 태클: {p1_tackles}회 vs {p2_tackles}회
- 인터셉트: {p1_intercepts}회 vs {p2_intercepts}회
→ {verdict_defense}

**🎯 강점**
**{player1_name}**
- {strength1_1}
- {strength1_2}
- {strength1_3}

**{player2_name}**
- {strength2_1}
- {strength2_2}
- {strength2_3}

**⚠️ 약점**
**{player1_name}**
- {weakness1_1}
- {weakness1_2}

**{player2_name}**
- {weakness2_1}
- {weakness2_2}

**💡 최종 평가**
{final_verdict}

**🏆 결론**
누가 더 나은가: {conclusion}
상황별 선택 기준: {situation_based_choice}

🔗 **출처**: Football-Data.org API, {season}시즌
"""

# ============================================
# 7. 유틸리티 함수
# ============================================

def get_player_comparison_prompt(
    player1_name: str,
    player1_team: str,
    player1_position: str,
    player1_stats: dict,
    player2_name: str,
    player2_team: str,
    player2_position: str,
    player2_stats: dict,
    detail_level: str = "standard"
) -> str:
    """
    선수 비교 프롬프트 생성
    
    📖 공식 문서: https://platform.openai.com/docs/guides/prompt-engineering
    🔗 참고: Structured output format
    
    Args:
        player1_name: 선수1 이름
        player1_team: 선수1 팀
        player1_position: 선수1 포지션
        player1_stats: 선수1 통계
        player2_name: 선수2 이름
        player2_team: 선수2 팀
        player2_position: 선수2 포지션
        player2_stats: 선수2 통계
        detail_level: 상세도 (brief/standard/detailed)
    
    Returns:
        생성된 프롬프트
    """
    if detail_level == "brief":
        return PLAYER_COMPARISON_BRIEF_PROMPT.format(
            player1_name=player1_name,
            player2_name=player2_name,
            stats_comparison=_format_stats_comparison(player1_stats, player2_stats)
        )
    else:
        return PLAYER_COMPARISON_DETAILED_PROMPT.format(
            player1_name=player1_name,
            player1_team=player1_team,
            player1_country=player1_stats.get("country", "N/A"),
            player1_position=player1_position,
            player1_age=player1_stats.get("age", "N/A"),
            season=player1_stats.get("season", "2024-25"),
            player1_matches=player1_stats.get("matches", 0),
            player1_goals=player1_stats.get("goals", 0),
            player1_assists=player1_stats.get("assists", 0),
            player1_shots=player1_stats.get("shots", 0),
            player1_shot_accuracy=player1_stats.get("shot_accuracy", 0),
            player1_passes=player1_stats.get("passes", 0),
            player1_pass_accuracy=player1_stats.get("pass_accuracy", 0),
            player1_tackles=player1_stats.get("tackles", 0),
            player1_intercepts=player1_stats.get("intercepts", 0),
            player1_rating=player1_stats.get("rating", 0),
            player1_characteristics=player1_stats.get("characteristics", ""),
            player2_name=player2_name,
            player2_team=player2_team,
            player2_country=player2_stats.get("country", "N/A"),
            player2_position=player2_position,
            player2_age=player2_stats.get("age", "N/A"),
            player2_matches=player2_stats.get("matches", 0),
            player2_goals=player2_stats.get("goals", 0),
            player2_assists=player2_stats.get("assists", 0),
            player2_shots=player2_stats.get("shots", 0),
            player2_shot_accuracy=player2_stats.get("shot_accuracy", 0),
            player2_passes=player2_stats.get("passes", 0),
            player2_pass_accuracy=player2_stats.get("pass_accuracy", 0),
            player2_tackles=player2_stats.get("tackles", 0),
            player2_intercepts=player2_stats.get("intercepts", 0),
            player2_rating=player2_stats.get("rating", 0),
            player2_characteristics=player2_stats.get("characteristics", "")
        )


def get_position_specific_comparison_prompt(
    position: str,
    player1_name: str,
    player1_stats: dict,
    player2_name: str,
    player2_stats: dict
) -> str:
    """
    포지션별 비교 프롬프트 생성
    
    Args:
        position: 포지션 (FW/MF/DF/GK)
        player1_name: 선수1 이름
        player1_stats: 선수1 통계
        player2_name: 선수2 이름
        player2_stats: 선수2 통계
    
    Returns:
        생성된 프롬프트
    """
    position_prompts = {
        "FW": FORWARD_COMPARISON_PROMPT,
        "MF": MIDFIELDER_COMPARISON_PROMPT,
        "DF": DEFENDER_COMPARISON_PROMPT,
    }
    
    prompt_template = position_prompts.get(position, PLAYER_COMPARISON_DETAILED_PROMPT)
    
    player1_info = f"{player1_name}: {player1_stats}"
    player2_info = f"{player2_name}: {player2_stats}"
    
    return prompt_template.format(
        player1_info=player1_info,
        player2_info=player2_info
    )


def _format_stats_comparison(stats1: dict, stats2: dict) -> str:
    """
    통계를 비교 포맷으로 변환
    
    Args:
        stats1: 선수1 통계
        stats2: 선수2 통계
    
    Returns:
        포맷된 문자열
    """
    return f"""
골: {stats1.get('goals', 0)} vs {stats2.get('goals', 0)}
도움: {stats1.get('assists', 0)} vs {stats2.get('assists', 0)}
경기: {stats1.get('matches', 0)} vs {stats2.get('matches', 0)}
평점: {stats1.get('rating', 0):.2f} vs {stats2.get('rating', 0):.2f}
"""