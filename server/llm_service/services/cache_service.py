from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import hashlib
import os

from .rag_service import RAGService
from ..utils.keyword_matcher import calculate_keyword_match, should_skip_judge_by_keyword

logger = logging.getLogger(__name__)


class CacheService:
    """
    통합 캐시 서비스

    ✅ ChromaDB: LLM 답변 캐시
    ✅ Firestore: API 데이터 캐시
    """

    def __init__(self):
        """
        캐시 서비스 초기화
        """
        self.rag_service = None
        self.cache_rag = None
        self._db = None
        
        try:
            self.rag_service = RAGService(persist_directory="chroma_db")
            self.cache_rag = RAGService(persist_directory="chroma_db_cache")
            logger.info("✅ CacheService 초기화 완료")
        except Exception as e:
            logger.warning(f"⚠️ ChromaDB 초기화 실패 (캐시 기능 비활성화): {e}")
            logger.warning("💡 해결 방법: ChromaDB 데이터베이스를 삭제하고 재생성하세요.")
            logger.warning("   rm -rf chroma_db chroma_db_cache")
            # ChromaDB 실패해도 서비스는 계속 실행 (캐시 없이)

    @property
    def db(self):
        """Firestore DB 지연 로딩"""
        if self._db is None:
            try:
                from firebase_admin import firestore

                self._db = firestore.client()
                logger.info("✅ Firestore 클라이언트 초기화")
            except Exception as e:
                logger.warning(f"⚠️ Firestore 초기화 실패: {e}")
                self._db = None
        return self._db

    # ============================================
    # PART 1: ChromaDB 답변 캐시
    # ============================================
    
    # LLM 답변 캐시 TTL (일) - 현업에서는 보통 7-30일
    LLM_CACHE_TTL_DAYS = 7  # 7일 후 자동 만료

    async def get_cached_answer(self, query: str) -> Optional[dict]:
        """
        ChromaDB에서 유사한 답변 검색

        비용: $0 (문서 검색만, LLM 호출 없음!)

        Args:
            query: 사용자 질문

        Returns:
            {
                "answer": "...",
                "confidence": 0.95,
                "similarity": 0.98,
                "source": "chromadb_cache"
            } 또는 None (캐시 미스)

        Example:
            >>> cached = await cache_service.get_cached_answer("손흥민 폼?")
            >>> if cached:
            ...     print(cached["answer"])
        """
        if not self.cache_rag:
            return None
            
        try:
            normalized = self._normalize_query(query)

            results = self.cache_rag.search(
                collection_name="cached_answers", query=normalized, top_k=1
            )

            logger.info(f"🔍 캐시 검색 결과: {len(results.get('ids', []))}개 발견")
            logger.info(f"🔍 검색된 IDs: {results.get('ids', [])}")

            if not results["ids"] or len(results["ids"]) == 0:
                logger.debug(f"⚠️ 캐시 미스: {query[:50]}")
                return None
            ...

            # 유사도 계산 (거리 → 유사도)
            distance = results["distances"][0]
            similarity = 1 - distance

            # 유사도 임계값 (설정 가능)
            # 0.85: 엄격한 기준 (제안된 값)
            # 0.7~0.75: 균형잡힌 기준 (권장)
            SIMILARITY_THRESHOLD = float(os.getenv("CACHE_SIMILARITY_THRESHOLD", "0.75"))
            
            # 유사도 임계값 이상: 캐시 후보 (Judge 노드에서 최종 판단)
            if similarity >= SIMILARITY_THRESHOLD:
                # TTL 체크: 만료된 캐시는 무시
                metadata = results["metadatas"][0] if results.get("metadatas") else {}
                created_at_str = metadata.get("created_at")
                
                if created_at_str:
                    try:
                        # ISO 포맷 파싱 (타임존 제거)
                        created_at_str_clean = created_at_str.split('+')[0].split('Z')[0]
                        created_at = datetime.fromisoformat(created_at_str_clean)
                        # 타임존 제거 (naive datetime으로 통일)
                        if created_at.tzinfo:
                            created_at = created_at.replace(tzinfo=None)
                        
                        now = datetime.now()
                        age_days = (now - created_at).days
                        
                        if age_days > self.LLM_CACHE_TTL_DAYS:
                            logger.info(
                                f"⏰ 캐시 만료: '{query[:50]}...' ({age_days}일 경과, TTL: {self.LLM_CACHE_TTL_DAYS}일)"
                            )
                            return None
                        else:
                            logger.debug(f"✅ 캐시 유효: {age_days}일 경과 (TTL: {self.LLM_CACHE_TTL_DAYS}일)")
                    except (ValueError, AttributeError, TypeError) as e:
                        logger.debug(f"⚠️ 캐시 날짜 파싱 실패: {e}, 캐시 사용 계속")

                # ============================================
                # 🆕 Keyword 검색 추가 (제민의 제안 2: 하이브리드 검색)
                # ============================================
                cached_answer_text = results["documents"][0]
                keyword_score = calculate_keyword_match(query, cached_answer_text)
                
                # Keyword 점수가 너무 낮으면 Judge 스킵, API 호출
                KEYWORD_THRESHOLD = float(os.getenv("KEYWORD_MATCH_THRESHOLD", "0.5"))
                if should_skip_judge_by_keyword(keyword_score, KEYWORD_THRESHOLD):
                    logger.info(
                        f"🔍 Keyword 점수 낮음 ({keyword_score:.2f} < {KEYWORD_THRESHOLD}) "
                        f"→ 캐시 무시, API 호출"
                    )
                    return None
                
                logger.info(
                    f"🎯 ChromaDB 캐시 히트: '{query[:50]}...' "
                    f"(유사도 {similarity:.2f}, Keyword {keyword_score:.2f})"
                )

                return {
                    "answer": cached_answer_text,
                    "confidence": similarity,
                    "similarity": similarity,
                    "keyword_score": keyword_score,  # 🆕 Keyword 점수 추가
                    "source": "chromadb_cache",
                }
            else:
                logger.debug(f"⚠️ 유사도 부족: {similarity:.2f} < {SIMILARITY_THRESHOLD}")
                return None

        except Exception as e:
            logger.warning(f"⚠️ ChromaDB 캐시 검색 실패: {e}")
            return None

    async def cache_answer(
        self, query: str, answer: str, metadata: Optional[dict] = None
    ) -> bool:
        """
        답변을 ChromaDB에 저장
        (다음 유사질문 시 재사용)

        비용: $0 (저장만, LLM 호출 없음!)

        Args:
            query: 원본 질문
            answer: LLM 답변
            metadata: 추가 정보 (RAG 소스, 모델명, 토큰 등)

        Returns:
            저장 성공 여부

        Example:
            >>> await cache_service.cache_answer(
            ...     "손흥민 폼?",
            ...     "손흥민은 최근 3골...",
            ...     metadata={"model": "gpt-4o-mini", "tokens": 350}
            ... )
        """
        if not self.cache_rag:
            return False
            
        try:
            normalized = self._normalize_query(query)

            # 고유 ID 생성 (쿼리 해시)
            query_hash = hashlib.md5(normalized.encode()).hexdigest()
            doc_id = f"answer_{query_hash}"

            # metadata에서 리스트 값 필터링 (추가!)
            filtered_metadata = {}
            if metadata:
                for key, value in metadata.items():
                    # str, int, float, bool, None만 허용
                    if isinstance(value, (str, int, float, bool, type(None))):
                        filtered_metadata[key] = value
                    elif isinstance(value, list):
                        # 리스트는 문자열로 변환
                        filtered_metadata[key] = str(value)

            # ChromaDB에 저장
            self.cache_rag.add_documents(
                collection_name="cached_answers",
                documents=[answer],
                metadatas=[
                    {
                        "original_query": query[:300],
                        "normalized_query": normalized,
                        "answer_preview": answer[:100],
                        "created_at": datetime.now().isoformat(),
                        "tokens_saved": 500,  # 예상 절감 토큰
                        **filtered_metadata,
                    }
                ],
                ids=[doc_id],
            )

            logger.info(f"✅ 답변 캐시 저장: {query[:50]}... (ID: {doc_id})")
            return True

        except Exception as e:
            logger.error(f"❌ 답변 캐시 저장 실패: {e}")
            return False

    # ============================================
    # PART 2: Firestore API 데이터 캐시
    # ============================================

    async def get_cached_api_data(self, api_type: str, params: dict) -> Optional[dict]:
        """
        Firestore에서 API 캐시 검색

        비용: $0 (조회만, API 호출 없음!)

        Args:
            api_type: API 유형 ("football_standings", "football_matches" 등)
            params: 파라미터 ({"competition": "PL"} 등)

        Returns:
            {
                "data": {...},
                "cached": True,
                "age_seconds": 120,
                "source": "firestore_cache"
            } 또는 None (캐시 미스/만료)

        Example:
            >>> cached = await cache_service.get_cached_api_data(
            ...     "football_standings",
            ...     {"competition": "PL"}
            ... )
        """
        try:
            if not self.db:
                logger.warning("⚠️ Firestore 미연결, API 캐시 스킵")
                return None

            cache_key = self._generate_cache_key(api_type, params)

            cache_doc = self.db.collection("api_cache").document(cache_key).get()

            if not cache_doc.exists:
                logger.debug(f"⚠️ API 캐시 미스: {cache_key}")
                return None

            cache_data = cache_doc.to_dict()
            expires_at = cache_data.get("expires_at")

            # 캐시 만료 확인
            if expires_at and expires_at < datetime.now():
                logger.info(f"🗑️ 만료된 캐시 삭제: {cache_key}")
                try:
                    cache_doc.reference.delete()
                except:
                    pass
                return None

            # 캐시 나이 계산
            created_at = cache_data.get("created_at")
            if created_at:
                age = (datetime.now() - created_at).total_seconds()
            else:
                age = 0

            logger.info(f"✅ Firestore 캐시 히트: {cache_key} ({age:.0f}초 캐시됨)")

            return {
                "data": cache_data.get("payload"),
                "cached": True,
                "age_seconds": int(age),
                "source": "firestore_cache",
            }

        except Exception as e:
            logger.warning(f"⚠️ Firestore 캐시 검색 실패: {e}")
            return None

    async def cache_api_data(
        self, api_type: str, params: dict, data: dict, ttl_hours: int = 1
    ) -> bool:
        """
        API 응답을 Firestore에 저장

        비용: 저장 비용만 (매우 저렴)

        Args:
            api_type: API 유형
            params: 파라미터
            data: API 응답 데이터
            ttl_hours: 캐시 유효 시간 (시간, 기본값: 1시간)

        Returns:
            저장 성공 여부

        Example:
            >>> await cache_service.cache_api_data(
            ...     "football_standings",
            ...     {"competition": "PL"},
            ...     api_response_data,
            ...     ttl_hours=1
            ... )
        """
        try:
            if not self.db:
                logger.warning("⚠️ Firestore 미연결, API 캐시 저장 스킵")
                return False

            cache_key = self._generate_cache_key(api_type, params)
            now = datetime.now()
            expires_at = now + timedelta(hours=ttl_hours)

            cache_doc = {
                "api_type": api_type,
                "params": params,
                "payload": data,
                "created_at": now,
                "expires_at": expires_at,
                "ttl_hours": ttl_hours,
            }

            self.db.collection("api_cache").document(cache_key).set(cache_doc)

            logger.info(f"✅ API 캐시 저장: {cache_key} (TTL: {ttl_hours}시간)")
            return True

        except Exception as e:
            logger.error(f"❌ API 캐시 저장 실패: {e}")
            return False

    # ============================================
    # PART 3: 유틸리티
    # ============================================

    @staticmethod
    def _normalize_query(query: str) -> str:
        """
        질문 정규화
        - 공백 제거
        - 소문자 변환
        - 최대 300자 제한

        Args:
            query: 원본 질문

        Returns:
            정규화된 질문

        Example:
            >>> _normalize_query("  Arsenal 최근 경기  ")
            "arsenal 최근 경기"
        """
        return query.strip().lower()[:300]

    @staticmethod
    def _generate_cache_key(api_type: str, params: dict) -> str:
        """
        캐시 키 생성 (고유성 보장)

        예시:
        - "football_standings_pl"
        - "football_matches_pl_finished_10"

        Args:
            api_type: API 유형
            params: 파라미터 딕셔너리

        Returns:
            캐시 키

        Example:
            >>> _generate_cache_key("football_standings", {"competition": "PL"})
            "football_standings_competition_pl"
        """
        param_str = "_".join(f"{k}_{str(v).lower()}" for k, v in sorted(params.items()))
        key = f"{api_type}_{param_str}"
        return key.replace(".", "_").replace("-", "_").replace(" ", "_")

    # ============================================
    # PART 4: 통계 & 모니터링 (보너스)
    # ============================================

    async def get_cache_stats(self) -> dict:
        """
        캐시 통계 조회

        Returns:
            {
                "chromadb_answers": 150,
                "firestore_cache": 45,
                "estimated_cost_saved": 12.50
            }
        """
        try:
            stats = {
                "chromadb_answers": 0,
                "firestore_cache": 0,
                "estimated_cost_saved": 0.0,
            }

            # ChromaDB 통계
            try:
                answer_stats = self.rag_service.get_collection_stats("cached_answers")
                stats["chromadb_answers"] = answer_stats.get("count", 0)
            except:
                pass

            # Firestore 통계
            if self.db:
                try:
                    cache_docs = list(self.db.collection("api_cache").stream())
                    stats["firestore_cache"] = len(cache_docs)
                except:
                    pass

            # 비용 절감 추정 (답변 캐시 × $0.001 + API 호출 $0.005)
            stats["estimated_cost_saved"] = (
                stats["chromadb_answers"] * 0.001 + stats["firestore_cache"] * 0.005
            )

            logger.info(f"📊 캐시 통계: {stats}")
            return stats

        except Exception as e:
            logger.error(f"❌ 캐시 통계 조회 실패: {e}")
            return {}
