"""
OpenAI API 클라이언트 및 헬퍼 함수
"""
import os
import logging
from typing import Optional, List, Dict, Any
from openai import OpenAI, APIError, RateLimitError
import tiktoken

logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI API와 상호작용하는 서비스"""
    
    def __init__(self):
        """
        OpenAI 클라이언트 초기화
        
        📖 공식 문서: https://platform.openai.com/docs/guides/chat-completions
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다")
        
        self.client = OpenAI(api_key=api_key)
        self.chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.embedding_model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        
        logger.info(f"✅ OpenAI 초기화 완료: {self.chat_model}")
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: int = 30
    ) -> str:
        """
        Chat Completion API 호출
        
        📖 공식 문서: https://platform.openai.com/docs/api-reference/chat/create
        🔗 엔드포인트: POST /chat/completions
        
        Args:
            messages: 메시지 리스트 [{"role": "user", "content": "..."}]
            system_prompt: 시스템 프롬프트 (선택)
            temperature: 창의성 (0.0~2.0, 기본값 0.7)
            max_tokens: 최대 토큰 (None=무제한)
            timeout: 요청 타임아웃 (초)
        
        Returns:
            모델의 응답 텍스트
        
        Raises:
            RateLimitError: API 속도 제한 초과
            APIError: API 에러
        
        Example:
            >>> service = OpenAIService()
            >>> response = service.chat(
            ...     messages=[{"role": "user", "content": "손흥민 최근 폼?"}],
            ...     system_prompt="축구 전문가"
            ... )
        """
        try:
            # 시스템 프롬프트가 있으면 메시지 앞에 추가
            if system_prompt:
                messages = [
                    {"role": "system", "content": system_prompt},
                    *messages
                ]
            
            # API 호출
            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout
            )
            
            # 응답 추출
            content = response.choices[0].message.content
            
            # 토큰 사용량 로깅
            logger.info(
                f"📊 토큰 사용: "
                f"입력={response.usage.prompt_tokens} "
                f"출력={response.usage.completion_tokens} "
                f"합계={response.usage.total_tokens}"
            )
            
            return content
        
        except RateLimitError as e:
            logger.error(f"⚠️ API 속도 제한: {e}")
            raise
        except APIError as e:
            logger.error(f"❌ OpenAI API 에러: {e}")
            raise
    
    def embedding(self, text: str) -> List[float]:
        """
        텍스트 임베딩 생성
        
        📖 공식 문서: https://platform.openai.com/docs/api-reference/embeddings
        🔗 엔드포인트: POST /embeddings
        
        Args:
            text: 임베딩할 텍스트
        
        Returns:
            임베딩 벡터 (1536차원)
        
        Example:
            >>> service = OpenAIService()
            >>> embedding = service.embedding("손흥민 골")
            >>> len(embedding)
            1536
        """
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            
            embedding = response.data[0].embedding
            logger.debug(f"✅ 임베딩 생성: {len(embedding)}차원")
            
            return embedding
        
        except APIError as e:
            logger.error(f"❌ 임베딩 생성 실패: {e}")
            raise
    
    def embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        여러 텍스트의 임베딩 일괄 생성
        
        Args:
            texts: 텍스트 리스트 (최대 2048개)
        
        Returns:
            임베딩 벡터 리스트
        
        Raises:
            ValueError: 텍스트 개수 초과
        
        Example:
            >>> service = OpenAIService()
            >>> texts = ["손흥민", "케인", "홀란드"]
            >>> embeddings = service.embeddings_batch(texts)
        """
        if len(texts) > 2048:
            raise ValueError("최대 2048개 텍스트까지만 처리 가능")
        
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=texts
            )
            
            # 응답에서 임베딩 추출 (정렬됨)
            embeddings = [item.embedding for item in response.data]
            logger.info(f"✅ {len(embeddings)}개 임베딩 생성 완료")
            
            return embeddings
        
        except APIError as e:
            logger.error(f"❌ 일괄 임베딩 생성 실패: {e}")
            raise
    
    def count_tokens(self, text: str) -> int:
        """
        텍스트의 토큰 개수 계산
        
        Args:
            text: 계산할 텍스트
        
        Returns:
            토큰 개수
        
        Example:
            >>> service = OpenAIService()
            >>> count = service.count_tokens("손흥민은 좋은 선수입니다")
            >>> print(count)
            8
        """
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            tokens = encoding.encode(text)
            return len(tokens)
        except Exception as e:
            logger.warning(f"⚠️ 토큰 계산 실패, 추정값 사용: {e}")
            # 폴백: 대략 1단어 = 1.3 토큰
            return int(len(text.split()) * 1.3)
    
    def estimate_cost(
        self,
        input_tokens: int,
        output_tokens: int
    ) -> Dict[str, Any]:
        """
        예상 비용 계산
        
        📖 가격: https://openai.com/pricing
        - gpt-4o-mini input: $0.150 / 1M tokens
        - gpt-4o-mini output: $0.600 / 1M tokens
        - text-embedding-3-small: $0.020 / 1M tokens
        
        Args:
            input_tokens: 입력 토큰 개수
            output_tokens: 출력 토큰 개수
        
        Returns:
            비용 정보 딕셔너리
        
        Example:
            >>> service = OpenAIService()
            >>> cost = service.estimate_cost(1000, 500)
            >>> print(f"${cost['total_usd']:.4f}")
        """
        # gpt-4o-mini 가격
        input_cost = (input_tokens / 1_000_000) * 0.150
        output_cost = (output_tokens / 1_000_000) * 0.600
        total_cost = input_cost + output_cost
        
        return {
            "model": self.chat_model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "input_cost_usd": round(input_cost, 6),
            "output_cost_usd": round(output_cost, 6),
            "total_usd": round(total_cost, 6)
        }

    def validate_context_length(
        self,
        messages: List[Dict[str, str]],
        context: str = ""
    ) -> bool:
        """
        메시지와 컨텍스트가 모델의 토큰 제한을 초과하는지 확인
        
        gpt-4o-mini 제한: 128,000 토큰 (안전선: 90%)
        
        Args:
            messages: 메시지 리스트
            context: 추가 컨텍스트 텍스트
        
        Returns:
            True if OK, False if 초과
        """
        total_text = "\n".join([msg.get("content", "") for msg in messages]) + context
        token_count = self.count_tokens(total_text)
        max_tokens = 128_000 * 0.9  # 안전선 90%
        
        if token_count > max_tokens:
            logger.warning(f"⚠️ 토큰 초과: {token_count} / {int(max_tokens)}")
            return False
        
        return True