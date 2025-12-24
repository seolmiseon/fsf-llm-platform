"""
캐시 데이터 충분성 판단 Judge 노드
제민의 제안 1: Decision Tree (Router 단계 분리)
제민의 제안 3: ReAct 방식 강제 (Thought → Action → Observation)

핵심: LLM이 캐시 데이터와 질문을 받아 "100% 답변 가능?" 판단
- YES → 캐시 사용
- NO/애매함 → CALL_API
"""
import logging
from typing import Literal, Optional
import os

from ..services.openai_service import OpenAIService

logger = logging.getLogger(__name__)

# Judge 프롬프트 (최적화: 짧고 명확하게)
JUDGE_PROMPT = """당신은 캐시 데이터 검증 전문가입니다.

사용자 질문과 캐시 데이터를 받아서, **이 캐시 데이터만으로 100% 정확하게 답변할 수 있는지** 판단하세요.

판단 기준:
1. 캐시 데이터가 질문의 핵심을 완전히 커버하는가?
2. 실시간 정보가 필요한가? (예: "오늘 경기 결과", "최신 순위")
3. 캐시 데이터가 오래되어 부정확할 수 있는가?

응답 형식 (반드시 지켜야 함):
[생각] 캐시 데이터를 분석하고, 질문의 요구사항을 확인합니다.
[판단] YES 또는 NO 또는 UNCERTAIN
[이유] 간단한 이유 (1-2문장)

YES: 캐시 데이터만으로 100% 답변 가능
NO: 실시간 API 호출 필수
UNCERTAIN: 애매함, 안전을 위해 API 호출 권장

예시:
[생각] 사용자가 "손흥민 최근 폼은?"이라고 물었고, 캐시에는 "손흥민은 최근 5경기에서 3골 2어시스트를 기록했습니다"라는 정보가 있습니다. 이 정보는 최근 성적을 포함하고 있어 질문에 답할 수 있습니다.
[판단] YES
[이유] 캐시 데이터에 최근 성적 정보가 포함되어 있어 질문에 답할 수 있습니다.

[생각] 사용자가 "오늘 토트넘 경기 결과는?"이라고 물었고, 캐시에는 "토트넘은 프리미어리그에서 강팀입니다"라는 정보만 있습니다. 오늘 경기 결과는 실시간 정보이므로 캐시로는 답할 수 없습니다.
[판단] NO
[이유] 오늘 경기 결과는 실시간 정보이므로 API 호출이 필수입니다.

[생각] 사용자가 "손흥민은 어떤 선수인가요?"라고 물었고, 캐시에는 "손흥민은 토트넘의 공격수입니다"라는 정보만 있습니다. 이 정보만으로는 충분하지 않을 수 있습니다.
[판단] UNCERTAIN
[이유] 기본 정보만 있어서 상세한 답변을 위해 추가 정보가 필요할 수 있습니다.
"""


class CacheJudge:
    """
    캐시 데이터 충분성 판단 Judge
    
    제민의 제안 3: ReAct 방식 강제
    - LLM이 '생각'을 입 밖으로 내뱉게 해서 논리적 모순을 깨닫게 함
    """
    
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def judge(
        self, 
        query: str, 
        cached_answer: str, 
        cache_similarity: float
    ) -> tuple[Literal["YES", "NO", "UNCERTAIN"], str]:
        """
        캐시 데이터 충분성 판단
        
        Args:
            query: 사용자 질문
            cached_answer: 캐시된 답변
            cache_similarity: 캐시 유사도 (0.0 ~ 1.0)
        
        Returns:
            (판단 결과, 이유)
            - "YES": 캐시 사용 가능
            - "NO": API 호출 필수
            - "UNCERTAIN": 애매함, API 호출 권장
        """
        try:
            # Judge 프롬프트 구성
            judge_message = f"""사용자 질문: {query}

캐시 데이터:
{cached_answer[:500]}  # 최대 500자만 전달 (비용 절감)

캐시 유사도: {cache_similarity:.2f}

위 정보를 바탕으로 판단하세요."""

            messages = [
                {"role": "system", "content": JUDGE_PROMPT},
                {"role": "user", "content": judge_message}
            ]
            
            # LLM 호출 (비용: 약 $0.0001~0.0005)
            response = await self.openai_service.chat(messages=messages)
            
            # 응답 파싱
            result, reason = self._parse_judge_response(response)
            
            logger.info(f"⚖️ Judge 판단: {result} (이유: {reason})")
            return result, reason
            
        except Exception as e:
            logger.error(f"❌ Judge 오류: {e}")
            # 오류 시 안전하게 API 호출 권장
            return "UNCERTAIN", f"Judge 오류: {str(e)}"
    
    def _parse_judge_response(self, response: str) -> tuple[Literal["YES", "NO", "UNCERTAIN"], str]:
        """
        Judge 응답 파싱
        
        ReAct 형식: [생각] ... [판단] YES/NO/UNCERTAIN [이유] ...
        """
        response_upper = response.upper()
        
        # 판단 결과 추출
        if "[판단]" in response_upper or "판단:" in response_upper:
            if "YES" in response_upper:
                result = "YES"
            elif "NO" in response_upper:
                result = "NO"
            else:
                result = "UNCERTAIN"
        else:
            # 형식이 안 맞으면 기본값
            result = "UNCERTAIN"
        
        # 이유 추출
        reason = "Judge 응답 파싱"
        if "[이유]" in response:
            reason_start = response.find("[이유]")
            reason = response[reason_start + 5:].strip()
        elif "이유:" in response:
            reason_start = response.find("이유:")
            reason = response[reason_start + 3:].strip()
        
        return result, reason

