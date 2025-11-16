
from typing import Dict, Any
import os


class PromptManager:
    """프롬프트 템플릿 관리자"""
    
    def __init__(self):
        self.prompts = {
            # 축구 채팅 프롬프트
            'chat': {
                'SYSTEM_PROMPT': """당신은 축구 전문가 AI 어시스턴트입니다.
사용자의 축구 관련 질문에 정확하고 유용한 정보를 제공합니다.

역할:
- 경기 분석 및 예측
- 선수 통계 및 비교
- 팀 전술 설명
- 축구 규칙 안내

답변 원칙:
1. 정확한 데이터를 기반으로 답변
2. 간결하고 이해하기 쉽게 설명
3. 필요시 추가 정보 제공
4. 주관적인 의견은 근거와 함께 제시
""",
                'USER_QUERY_TEMPLATE': """사용자 질문: {query}

컨텍스트 정보:
{context}

위 정보를 바탕으로 사용자의 질문에 답변해주세요.
"""
            },
            
            # 경기 분석 프롬프트
            'match_analysis': {
                'ANALYSIS_PROMPT': """다음 경기를 분석해주세요:

경기 정보:
{match_info}

분석 항목:
1. 경기 흐름 및 주요 순간
2. 팀별 전술 분석
3. 주요 선수 퍼포먼스
4. 승패 요인
5. 통계적 인사이트

상세하고 전문적으로 분석해주세요.
""",
                'PREDICTION_PROMPT': """다음 경기를 예측해주세요:

경기 정보:
{match_info}

팀 최근 폼:
{team_form}

상대 전적:
{head_to_head}

예측 항목:
1. 예상 스코어
2. 승리 팀 및 확률
3. 주요 근거 (최소 3가지)
4. 주목할 선수

근거를 명확히 제시해주세요.
"""
            },
            
            # 선수 비교 프롬프트
            'player_compare': {
                'COMPARISON_PROMPT': """두 선수를 비교 분석해주세요:

선수 1: {player1_info}
선수 2: {player2_info}

비교 항목:
1. 주요 통계 비교 (골, 어시스트, 패스 성공률 등)
2. 포지션별 강점
3. 플레이 스타일
4. 팀 기여도
5. 종합 평가

객관적인 데이터를 기반으로 분석해주세요.
"""
            },
            
            # 응급 상황 프롬프트 (기존 코드에서 사용)
            'gps_alerts': {
                'EMERGENCY_ASSESSMENT_PROMPT': """다음 상황을 분석하여 응급도를 판단해주세요:

상황: {situation}

분석 항목:
1. 응급도 (낮음/중간/높음/매우 높음)
2. 즉시 119에 연락해야 하는지 여부
3. 간단한 대처 방법

간결하고 명확하게 답변해주세요.
"""
            }
        }
    
    def get_prompt(self, category: str, prompt_name: str) -> str:
        """프롬프트 템플릿 가져오기"""
        try:
            return self.prompts[category][prompt_name]
        except KeyError:
            raise ValueError(f"프롬프트를 찾을 수 없습니다: {category}.{prompt_name}")
    
    def format_prompt(self, category: str, prompt_name: str, **kwargs) -> str:
        """프롬프트 템플릿에 변수 채우기"""
        template = self.get_prompt(category, prompt_name)
        return template.format(**kwargs)
    
    def add_prompt(self, category: str, prompt_name: str, template: str):
        """새 프롬프트 추가"""
        if category not in self.prompts:
            self.prompts[category] = {}
        self.prompts[category][prompt_name] = template
    
    def list_prompts(self, category: str = None) -> Dict[str, Any]:
        """프롬프트 목록 조회"""
        if category:
            return {category: list(self.prompts.get(category, {}).keys())}
        return {cat: list(prompts.keys()) for cat, prompts in self.prompts.items()}


class PromptService:
    """프롬프트 서비스 - OpenAI Service에서 사용"""
    
    def __init__(self):
        self.manager = PromptManager()
    
    def get_chat_prompt(self, query: str, context: str = "") -> str:
        """채팅용 프롬프트 생성"""
        return self.manager.format_prompt(
            'chat', 
            'USER_QUERY_TEMPLATE',
            query=query,
            context=context or "관련 정보가 없습니다."
        )
    
    def get_system_prompt(self) -> str:
        """시스템 프롬프트 가져오기"""
        return self.manager.get_prompt('chat', 'SYSTEM_PROMPT')
    
    def get_match_analysis_prompt(self, match_info: str) -> str:
        """경기 분석 프롬프트 생성"""
        return self.manager.format_prompt(
            'match_analysis',
            'ANALYSIS_PROMPT',
            match_info=match_info
        )
    
    def get_prediction_prompt(self, match_info: str, team_form: str, head_to_head: str) -> str:
        """경기 예측 프롬프트 생성"""
        return self.manager.format_prompt(
            'match_analysis',
            'PREDICTION_PROMPT',
            match_info=match_info,
            team_form=team_form,
            head_to_head=head_to_head
        )
    
    def get_player_comparison_prompt(self, player1_info: str, player2_info: str) -> str:
        """선수 비교 프롬프트 생성"""
        return self.manager.format_prompt(
            'player_compare',
            'COMPARISON_PROMPT',
            player1_info=player1_info,
            player2_info=player2_info
        )