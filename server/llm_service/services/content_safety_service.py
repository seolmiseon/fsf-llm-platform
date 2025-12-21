"""
Content Safety Service
유해 콘텐츠 및 금지어 필터링 서비스

기능:
1. 입력 게이트웨이: 사용자 쿼리 필터링
2. 출력 필터: LLM 응답 필터링
3. 커스텀 블랙리스트 지원
4. LLM 기반 정교한 감지 및 카테고리 분류
5. 향후 GCP Content Safety API 통합 가능
"""

import re
import logging
import json
import os
from typing import Dict, List, Optional, Tuple
from enum import Enum
from openai import OpenAI

logger = logging.getLogger(__name__)


class ContentCategory(str, Enum):
    """콘텐츠 카테고리"""
    HARMFUL = "harmful"  # 유해 콘텐츠
    PROFANITY = "profanity"  # 욕설
    HATE_SPEECH = "hate_speech"  # 혐오 발언
    SPAM = "spam"  # 스팸
    PERSONAL_INFO = "personal_info"  # 개인정보
    INAPPROPRIATE = "inappropriate"  # 부적절한 내용


class ContentSafetyResult:
    """콘텐츠 안전성 검사 결과"""
    def __init__(
        self,
        is_safe: bool,
        category: Optional[ContentCategory] = None,
        detected_words: Optional[List[str]] = None,
        reason: Optional[str] = None
    ):
        self.is_safe = is_safe
        self.category = category
        self.detected_words = detected_words or []
        self.reason = reason

    def to_dict(self) -> Dict:
        return {
            "is_safe": self.is_safe,
            "category": self.category.value if self.category else None,
            "detected_words": self.detected_words,
            "reason": self.reason
        }


class ContentSafetyService:
    """콘텐츠 안전성 검사 서비스"""
    
    def __init__(self, use_llm: bool = True):
        """초기화: 블랙리스트 및 패턴 로드"""
        # 커스텀 블랙리스트 (프로젝트 고유 규칙)
        self.custom_blacklist = self._load_custom_blacklist()
        
        # 유해 콘텐츠 패턴 (한글/영문)
        self.harmful_patterns = self._load_harmful_patterns()
        
        # 스팸 패턴
        self.spam_patterns = self._load_spam_patterns()
        
        # LLM 기반 감지 활성화 여부
        self.use_llm = use_llm
        self.llm_client = None
        
        if self.use_llm:
            try:
                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    self.llm_client = OpenAI(api_key=api_key)
                    self.llm_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
                    logger.info("✅ LLM 기반 콘텐츠 감지 활성화")
                else:
                    logger.warning("⚠️ OPENAI_API_KEY가 없어 LLM 기반 감지 비활성화")
                    self.use_llm = False
            except Exception as e:
                logger.warning(f"⚠️ LLM 클라이언트 초기화 실패: {e}")
                self.use_llm = False
        
        logger.info("✅ Content Safety Service 초기화 완료")

    def _load_custom_blacklist(self) -> List[str]:
        """
        커스텀 블랙리스트 로드
        프로젝트 고유의 금지어 목록 (예: 특정 고객사 이름, 기밀 정보 등)
        """
        # TODO: 환경변수나 설정 파일에서 로드 가능
        return [
            # 예시: 프로젝트 특정 금지어
            # "기밀정보",
            # "내부문서",
        ]

    def _load_harmful_patterns(self) -> Dict[ContentCategory, List[str]]:
        """유해 콘텐츠 패턴 로드"""
        return {
            ContentCategory.PROFANITY: [
                # 한글 욕설 패턴 (일부 예시)
                r"(시|씨)발",
                r"(병|빙)신",
                r"(좆|좃)",
                r"개새",
                # 영문 욕설 (일부 예시)
                r"\b(fuck|shit|damn|bitch|asshole)\b",
            ],
            ContentCategory.HATE_SPEECH: [
                # 혐오 발언 패턴
                r"(동|서|남|북)독",
                r"일본놈",
                r"중국놈",
            ],
            ContentCategory.HARMFUL: [
                # 자해/폭력 관련
                r"자살",
                r"자해",
                r"살인",
                r"폭탄",
                r"테러",
            ],
            ContentCategory.INAPPROPRIATE: [
                # 성인 콘텐츠 관련
                r"성인사이트",
                r"포르노",
            ],
        }

    def _load_spam_patterns(self) -> List[str]:
        """스팸 패턴 로드"""
        return [
            # 광고/스팸 패턴
            r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+",  # URL
            r"[0-9]{3,}-[0-9]{3,}-[0-9]{4,}",  # 전화번호
            r"[가-힣]*판매",  # 중고판매
            r"[가-힣]*만남",  # 만남 유도
            r"[가-힣]*광고",
            r"[가-힣]*홍보",
            r"[가-힣]*거래",  # 거래 유도
            r"[가-힣]*구매",  # 구매 유도
            r"[가-힣]*판매.*[가-힣]*",  # 판매 관련 문구
            r"카톡|카카오톡|문의|연락",  # 연락처 요청
        ]

    def check_input(self, text: str, use_llm_fallback: bool = True) -> ContentSafetyResult:
        """
        입력 게이트웨이: 사용자 쿼리 필터링
        
        Args:
            text: 사용자 입력 텍스트
            use_llm_fallback: 정규식에서 감지되지 않았을 때 LLM 체크 수행 여부
            
        Returns:
            ContentSafetyResult: 검사 결과
        """
        if not text or not text.strip():
            return ContentSafetyResult(
                is_safe=True,
                reason="빈 입력"
            )

        text_lower = text.lower()
        detected_words = []

        # 1. 커스텀 블랙리스트 체크
        for word in self.custom_blacklist:
            if word.lower() in text_lower:
                detected_words.append(word)
                return ContentSafetyResult(
                    is_safe=False,
                    category=ContentCategory.HARMFUL,
                    detected_words=[word],
                    reason=f"커스텀 블랙리스트에 포함된 단어 감지: {word}"
                )

        # 2. 유해 콘텐츠 패턴 체크
        for category, patterns in self.harmful_patterns.items():
            for pattern in patterns:
                try:
                    matches = re.findall(pattern, text_lower, re.IGNORECASE)
                    if matches:
                        detected_words.extend(matches)
                        return ContentSafetyResult(
                            is_safe=False,
                            category=category,
                            detected_words=list(set(matches)),
                            reason=f"{category.value} 패턴 감지"
                        )
                except re.error as e:
                    logger.warning(f"⚠️ 정규식 패턴 오류 (무시): {pattern} - {e}")
                    continue

        # 3. 스팸 패턴 체크
        for pattern in self.spam_patterns:
            try:
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                if matches:
                    detected_words.extend(matches)
                    return ContentSafetyResult(
                        is_safe=False,
                        category=ContentCategory.SPAM,
                        detected_words=list(set(matches)),
                        reason="스팸 패턴 감지"
                    )
            except re.error as e:
                logger.warning(f"⚠️ 정규식 패턴 오류 (무시): {pattern} - {e}")
                continue

        # 4. LLM 기반 정교한 감지 (정규식에서 감지되지 않은 경우)
        if self.use_llm and use_llm_fallback and self.llm_client:
            try:
                llm_result = self._check_with_llm(text)
                if not llm_result.is_safe:
                    logger.info(f"🤖 LLM 기반 유해 콘텐츠 감지: {llm_result.category}")
                    return llm_result
            except Exception as e:
                logger.warning(f"⚠️ LLM 기반 감지 실패 (정규식 결과 사용): {e}")

        # 안전한 콘텐츠
        return ContentSafetyResult(
            is_safe=True,
            reason="안전한 콘텐츠"
        )
    
    def _check_with_llm(self, text: str) -> ContentSafetyResult:
        """
        LLM을 사용한 정교한 콘텐츠 안전성 검사
        
        Args:
            text: 검사할 텍스트
            
        Returns:
            ContentSafetyResult: 검사 결과
        """
        if not self.llm_client:
            return ContentSafetyResult(is_safe=True, reason="LLM 비활성화")
        
        try:
            prompt = f"""다음 텍스트가 부적절한 내용을 포함하고 있는지 분석해주세요.

텍스트: "{text}"

다음 카테고리 중 하나를 선택하거나, 안전한 경우 "safe"를 반환하세요:
- profanity: 욕설, 비속어
- hate_speech: 혐오 발언, 차별적 표현
- spam: 스팸, 광고, 중고판매, 만남 유도, 거래 유도
- harmful: 자해, 폭력, 위험한 행동 유도
- inappropriate: 성인 콘텐츠, 부적절한 내용
- personal_info: 개인정보 요청 또는 노출
- safe: 안전한 콘텐츠

JSON 형식으로 응답해주세요:
{{
    "is_safe": true/false,
    "category": "카테고리명 또는 safe",
    "reason": "감지 이유 (한국어)",
    "detected_phrases": ["감지된 구문1", "감지된 구문2"]
}}"""

            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": "당신은 콘텐츠 안전성 검사 전문가입니다. 정확하고 객관적으로 분석해주세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200,
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # JSON 파싱 시도
            try:
                # JSON 코드 블록 제거
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                result_dict = json.loads(response_text)
                
                is_safe = result_dict.get("is_safe", True)
                category_str = result_dict.get("category", "safe")
                reason = result_dict.get("reason", "")
                detected_phrases = result_dict.get("detected_phrases", [])
                
                if category_str == "safe" or is_safe:
                    return ContentSafetyResult(
                        is_safe=True,
                        reason=reason or "LLM 검사 결과 안전"
                    )
                
                # 카테고리 매핑
                category = None
                try:
                    category = ContentCategory(category_str)
                except ValueError:
                    # 매핑되지 않은 카테고리는 INAPPROPRIATE로 처리
                    category = ContentCategory.INAPPROPRIATE
                
                return ContentSafetyResult(
                    is_safe=False,
                    category=category,
                    detected_words=detected_phrases,
                    reason=reason or f"LLM 기반 {category_str} 감지"
                )
                
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ LLM 응답 JSON 파싱 실패: {response_text}, 오류: {e}")
                # JSON 파싱 실패 시 안전한 것으로 간주
                return ContentSafetyResult(
                    is_safe=True,
                    reason="LLM 응답 파싱 실패"
                )
                
        except Exception as e:
            logger.error(f"❌ LLM 기반 감지 오류: {e}", exc_info=True)
            # 오류 발생 시 안전한 것으로 간주 (페일-세이프)
            return ContentSafetyResult(
                is_safe=True,
                reason=f"LLM 검사 오류: {str(e)}"
            )

    def check_output(self, text: str) -> ContentSafetyResult:
        """
        출력 필터: LLM 응답 필터링
        
        Args:
            text: LLM 응답 텍스트
            
        Returns:
            ContentSafetyResult: 검사 결과
        """
        # 출력 필터는 입력 필터와 동일한 로직 사용
        # (향후 출력 전용 규칙 추가 가능)
        return self.check_input(text)

    def filter_text(self, text: str, replacement: str = "***") -> str:
        """
        텍스트에서 금지어를 마스킹
        
        Args:
            text: 원본 텍스트
            replacement: 대체 문자
            
        Returns:
            필터링된 텍스트
        """
        result = text
        detected_words = []

        # 모든 패턴을 찾아서 마스킹
        all_patterns = []
        for patterns in self.harmful_patterns.values():
            all_patterns.extend(patterns)
        all_patterns.extend(self.spam_patterns)

        for pattern in all_patterns:
            matches = re.findall(pattern, result, re.IGNORECASE)
            if matches:
                detected_words.extend(matches)
                # 패턴을 대체 문자로 변경
                result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        # 커스텀 블랙리스트도 마스킹
        for word in self.custom_blacklist:
            if word.lower() in result.lower():
                result = re.sub(
                    re.escape(word),
                    replacement,
                    result,
                    flags=re.IGNORECASE
                )

        return result
    
    def classify_category(self, title: str, content: str) -> str:
        """
        게시글 카테고리 자동 분류 (LLM 활용)
        
        Args:
            title: 게시글 제목
            content: 게시글 내용
            
        Returns:
            str: 카테고리명 (예: "축구분석", "자유게시판", "질문", "정보공유" 등)
        """
        if not self.llm_client:
            return "general"  # LLM 비활성화 시 기본값
        
        try:
            prompt = f"""다음 게시글의 카테고리를 자동으로 분류해주세요.

제목: "{title}"
내용: "{content[:500]}"  # 내용이 길면 500자까지만

다음 카테고리 중 하나를 선택하세요:
- 축구분석: 경기 분석, 전술 분석, 팀/선수 분석
- 자유게시판: 일반적인 대화, 자유로운 주제
- 질문: 질문, 도움 요청
- 정보공유: 뉴스, 정보 공유, 링크 공유
- 후기: 경기 후기, 관람 후기
- general: 기타

카테고리명만 반환해주세요 (예: "축구분석", "자유게시판" 등)."""

            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": "당신은 게시글 카테고리 분류 전문가입니다. 정확하게 카테고리를 분류해주세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=50,
            )
            
            category = response.choices[0].message.content.strip()
            
            # 따옴표 제거
            category = category.strip('"\'')
            
            # 유효한 카테고리 확인
            valid_categories = ["축구분석", "자유게시판", "질문", "정보공유", "후기", "general"]
            if category not in valid_categories:
                logger.warning(f"⚠️ 유효하지 않은 카테고리: {category}, 기본값 사용")
                return "general"
            
            logger.info(f"📂 카테고리 자동 분류: {category}")
            return category
            
        except Exception as e:
            logger.warning(f"⚠️ 카테고리 자동 분류 실패: {e}, 기본값 사용")
            return "general"


