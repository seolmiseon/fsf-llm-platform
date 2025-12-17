"""
Content Safety Service
유해 콘텐츠 및 금지어 필터링 서비스

기능:
1. 입력 게이트웨이: 사용자 쿼리 필터링
2. 출력 필터: LLM 응답 필터링
3. 커스텀 블랙리스트 지원
4. 향후 GCP Content Safety API 통합 가능
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from enum import Enum

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
    
    def __init__(self):
        """초기화: 블랙리스트 및 패턴 로드"""
        # 커스텀 블랙리스트 (프로젝트 고유 규칙)
        self.custom_blacklist = self._load_custom_blacklist()
        
        # 유해 콘텐츠 패턴 (한글/영문)
        self.harmful_patterns = self._load_harmful_patterns()
        
        # 스팸 패턴
        self.spam_patterns = self._load_spam_patterns()
        
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
                r"[시씨]발",
                r"[병빙]신",
                r"[좆좃]",
                r"[개]새",
                # 영문 욕설 (일부 예시)
                r"\b(fuck|shit|damn|bitch|asshole)\b",
            ],
            ContentCategory.HATE_SPEECH: [
                # 혐오 발언 패턴
                r"[동서남북]독",
                r"[일]본[놈]",
                r"[중]국[놈]",
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
                r"[성]인[사이트]",
                r"[포]르노",
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
        ]

    def check_input(self, text: str) -> ContentSafetyResult:
        """
        입력 게이트웨이: 사용자 쿼리 필터링
        
        Args:
            text: 사용자 입력 텍스트
            
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
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                if matches:
                    detected_words.extend(matches)
                    return ContentSafetyResult(
                        is_safe=False,
                        category=category,
                        detected_words=list(set(matches)),
                        reason=f"{category.value} 패턴 감지"
                    )

        # 3. 스팸 패턴 체크
        for pattern in self.spam_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                detected_words.extend(matches)
                return ContentSafetyResult(
                    is_safe=False,
                    category=ContentCategory.SPAM,
                    detected_words=list(set(matches)),
                    reason="스팸 패턴 감지"
                )

        # 안전한 콘텐츠
        return ContentSafetyResult(
            is_safe=True,
            reason="안전한 콘텐츠"
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


