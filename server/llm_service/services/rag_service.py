"""
ChromaDB를 사용한 RAG (Retrieval-Augmented Generation) 시스템
개선 및 최적화 버전
"""
import os
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)

class RAGService:
    """
    ChromaDB를 사용한 벡터 검색 및 RAG 시스템
    
    📖 공식 문서: https://docs.trychroma.com/
    🔗 참고: Getting Started with Chroma
    """
    
    def __init__(self, persist_dir: Optional[str] = None):
        """
        ChromaDB 클라이언트 초기화
        
        Args:
            persist_dir: 데이터 저장 디렉토리 (None=메모리 모드)
        
        Example:
            >>> rag = RAGService(persist_dir="./data/chroma_db")
            >>> print(rag.client)
        """
        try:
            # 저장 디렉토리 설정
            if persist_dir is None:
                persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
            
            # 디렉토리 생성
            os.makedirs(persist_dir, exist_ok=True)
            logger.info(f"📁 ChromaDB 디렉토리: {persist_dir}")
            
            # ChromaDB 클라이언트 초기화 (PersistentClient)
            # 📖 문서: https://docs.trychroma.com/reference/py-client#persistentclient
            self.client = chromadb.PersistentClient(path=persist_dir)
            self.persist_dir = persist_dir
            
            logger.info(f"✅ ChromaDB 클라이언트 초기화 성공")
            logger.info(f"📊 저장 위치: {persist_dir}")
            
        except Exception as e:
            logger.error(f"❌ ChromaDB 초기화 실패: {e}")
            raise
    
    def get_or_create_collection(
        self, 
        name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        컬렉션 조회 또는 생성
        
        📖 문서: https://docs.trychroma.com/reference/py-client#get_or_create_collection
        
        Args:
            name: 컬렉션 이름
            metadata: 컬렉션 메타데이터 (선택)
                예: {"hnsw:space": "cosine"}
        
        Returns:
            ChromaDB 컬렉션 객체
        
        Example:
            >>> rag = RAGService()
            >>> collection = rag.get_or_create_collection("matches")
            >>> print(collection.name)
            'matches'
        """
        try:
            if metadata is None:
                metadata = {"hnsw:space": "cosine"}
            
            collection = self.client.get_or_create_collection(
                name=name,
                metadata=metadata
            )
            
            count = collection.count()
            logger.info(f"✅ 컬렉션 조회/생성 성공: {name} (문서 수: {count})")
            
            return collection
            
        except Exception as e:
            logger.error(f"❌ 컬렉션 조회/생성 실패 ({name}): {e}")
            raise
    
    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> None:
        """
        문서 추가 (자동 임베딩)
        
        📖 문서: https://docs.trychroma.com/reference/py-client#add
        
        ChromaDB는 자동으로 문서를 임베딩합니다.
        기본 임베딩 모델: all-MiniLM-L6-v2 (빠르고 가벼움)
        
        Args:
            collection_name: 컬렉션 이름
            documents: 문서 텍스트 리스트
            metadatas: 메타데이터 리스트 (각 문서마다)
            ids: 문서 ID 리스트 (기본값: 자동 생성)
        
        Raises:
            ValueError: 문서와 메타데이터 개수 불일치
            Exception: 추가 실패
        
        Example:
            >>> rag = RAGService()
            >>> rag.add_documents(
            ...     "matches",
            ...     ["Arsenal 3-1 Chelsea", "Liverpool 2-0 Man City"],
            ...     [
            ...         {"team": "Arsenal", "date": "2024-10-17"},
            ...         {"team": "Liverpool", "date": "2024-10-18"}
            ...     ]
            ... )
        """
        try:
            # 입력 검증
            if len(documents) != len(metadatas):
                raise ValueError(
                    f"문서({len(documents)})와 메타데이터({len(metadatas)}) 개수 불일치"
                )
            
            if len(documents) == 0:
                logger.warning("⚠️ 추가할 문서가 없습니다")
                return
            
            # 컬렉션 조회
            collection = self.get_or_create_collection(collection_name)
            
            # ID 자동 생성 (없는 경우)
            if ids is None:
                ids = [f"doc_{collection_name}_{i}" for i in range(len(documents))]
            
            # 문서 추가
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(
                f"✅ {len(documents)}개 문서 추가 성공 (컬렉션: {collection_name})"
            )
            
            # 추가된 문서 확인
            new_count = collection.count()
            logger.info(f"📊 현재 컬렉션 문서 수: {new_count}")
            
        except ValueError as e:
            logger.error(f"❌ 입력 오류: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ 문서 추가 실패 ({collection_name}): {e}")
            raise
    
    def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        벡터 검색 (쿼리 자동 임베딩)
        
        📖 문서: https://docs.trychroma.com/reference/py-client#query
        
        Args:
            collection_name: 컬렉션 이름
            query: 검색 쿼리 텍스트
            top_k: 반환할 상위 K개 결과 (1-100)
            where: 메타데이터 필터 (선택사항)
                예: {"team": "Arsenal"}
                예: {"$gte": {"rating": 0.8}}
        
        Returns:
            {
                "ids": [...],           # 문서 ID 리스트
                "documents": [...],     # 문서 텍스트 리스트
                "metadatas": [...],     # 메타데이터 리스트
                "distances": [...]      # 거리 (작을수록 유사)
            }
        
        Raises:
            Exception: 검색 실패
        
        Example:
            >>> rag = RAGService()
            >>> results = rag.search("matches", "Arsenal 최근 경기", top_k=5)
            >>> print(f"찾음: {len(results['ids'])}개")
        """
        try:
            # 입력 검증
            if not query:
                raise ValueError("검색 쿼리가 비어있습니다")
            
            if top_k < 1 or top_k > 100:
                logger.warning(f"⚠️ top_k={top_k} 범위 재조정")
                top_k = max(1, min(top_k, 100))
            
            # 컬렉션 조회
            collection = self.get_or_create_collection(collection_name)
            
            # 검색 실행
            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
            
            # 결과 포맷팅 (배열 언래핑)
            if results["ids"] and len(results["ids"]) > 0:
                formatted_results = {
                    "ids": results["ids"][0],
                    "documents": results["documents"][0],
                    "metadatas": results["metadatas"][0],
                    "distances": results["distances"][0],
                }
                
                logger.info(
                    f"✅ 검색 성공: '{query}' → {len(formatted_results['ids'])}개 결과"
                )
                
                # 결과 상세 로깅
                for i, (doc_id, similarity) in enumerate(
                    zip(formatted_results["ids"], formatted_results["distances"])
                ):
                    sim_score = 1 - similarity  # 거리 → 유사도
                    logger.debug(f"  [{i+1}] {doc_id}: 유사도 {sim_score:.3f}")
                
                return formatted_results
            else:
                logger.warning(f"⚠️ 검색 결과 없음: '{query}'")
                return {
                    "ids": [],
                    "documents": [],
                    "metadatas": [],
                    "distances": [],
                }
            
        except ValueError as e:
            logger.error(f"❌ 입력 오류: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ 검색 실패 ({collection_name}): {e}")
            raise
    
    def delete_collection(self, collection_name: str) -> None:
        """
        컬렉션 삭제
        
        📖 문서: https://docs.trychroma.com/reference/py-client#delete_collection
        
        Args:
            collection_name: 컬렉션 이름
        
        Example:
            >>> rag = RAGService()
            >>> rag.delete_collection("old_matches")
            >>> print("삭제 완료")
        """
        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"✅ 컬렉션 삭제 성공: {collection_name}")
        except Exception as e:
            logger.error(f"❌ 컬렉션 삭제 실패 ({collection_name}): {e}")
            raise
    
    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """
        컬렉션 통계 조회
        
        Args:
            collection_name: 컬렉션 이름
        
        Returns:
            {
                "name": 컬렉션 이름,
                "count": 총 문서 수,
                "metadata": 메타데이터
            }
        
        Example:
            >>> rag = RAGService()
            >>> stats = rag.get_collection_stats("matches")
            >>> print(f"문서 수: {stats['count']}")
        """
        try:
            collection = self.get_or_create_collection(collection_name)
            
            stats = {
                "name": collection_name,
                "count": collection.count(),
                "metadata": collection.metadata,
            }
            
            logger.info(f"📊 컬렉션 통계: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"❌ 통계 조회 실패 ({collection_name}): {e}")
            raise
    
    def update_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
    ) -> None:
        """
        문서 업데이트
        
        📖 문서: https://docs.trychroma.com/reference/py-client#update
        
        Args:
            collection_name: 컬렉션 이름
            documents: 새로운 문서 텍스트
            metadatas: 새로운 메타데이터
            ids: 업데이트할 문서 ID
        
        Example:
            >>> rag = RAGService()
            >>> rag.update_documents(
            ...     "matches",
            ...     ["Arsenal 4-1 Chelsea (업데이트)"],
            ...     [{"team": "Arsenal", "updated": True}],
            ...     ["doc_matches_0"]
            ... )
        """
        try:
            # 입력 검증
            if len(documents) != len(metadatas) or len(documents) != len(ids):
                raise ValueError("문서, 메타데이터, ID 개수 불일치")
            
            collection = self.get_or_create_collection(collection_name)
            
            collection.update(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ {len(ids)}개 문서 업데이트 성공: {collection_name}")
            
        except ValueError as e:
            logger.error(f"❌ 입력 오류: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ 문서 업데이트 실패 ({collection_name}): {e}")
            raise
    
    def delete_documents(self, collection_name: str, ids: List[str]) -> None:
        """
        문서 삭제
        
        📖 문서: https://docs.trychroma.com/reference/py-client#delete
        
        Args:
            collection_name: 컬렉션 이름
            ids: 삭제할 문서 ID 리스트
        
        Example:
            >>> rag = RAGService()
            >>> rag.delete_documents("matches", ["doc_matches_0", "doc_matches_1"])
        """
        try:
            if not ids:
                logger.warning("⚠️ 삭제할 문서가 없습니다")
                return
            
            collection = self.get_or_create_collection(collection_name)
            collection.delete(ids=ids)
            
            logger.info(f"✅ {len(ids)}개 문서 삭제 성공: {collection_name}")
            
        except Exception as e:
            logger.error(f"❌ 문서 삭제 실패 ({collection_name}): {e}")
            raise
    
    def list_collections(self) -> List[str]:
        """
        모든 컬렉션 목록 조회
        
        ChromaDB 버전 호환성 개선 버전
        
        Returns:
            컬렉션 이름 리스트
        
        Example:
            >>> rag = RAGService()
            >>> collections = rag.list_collections()
            >>> print(f"컬렉션: {collections}")
        """
        try:
            # ChromaDB 컬렉션 조회 (버전 호환)
            collections = self.client.list_collections()
            
            # 응답 형식에 따라 처리
            if isinstance(collections, list):
                # 리스트로 반환되는 경우
                if len(collections) > 0:
                    # 첫 번째 요소가 객체인 경우
                    if hasattr(collections[0], 'name'):
                        collection_names = [c.name for c in collections]
                    else:
                        # 첫 번째 요소가 문자열인 경우
                        collection_names = collections
                else:
                    collection_names = []
            else:
                # 다른 형식인 경우 (예: dict 등)
                collection_names = []
            
            logger.info(f"✅ 컬렉션 목록: {collection_names}")
            return collection_names
            
        except Exception as e:
            logger.warning(f"⚠️ 컬렉션 목록 조회 실패 (폴백 사용): {e}")
            
            # 폴백: 알려진 컬렉션 이름 반환
            fallback_names = ["matches", "standings", "teams"]
            
            try:
                # 폴백으로 직접 조회 시도
                stats = []
                for name in fallback_names:
                    try:
                        collection = self.client.get_collection(name)
                        if collection is not None:
                            stats.append(name)
                    except:
                        pass
                
                if stats:
                    logger.info(f"✅ 폴백 컬렉션 목록: {stats}")
                    return stats
            except:
                pass
            
            logger.warning(f"⚠️ 컬렉션 목록을 조회할 수 없습니다 (기본값 반환)")
            return fallback_names
    
    def reset_database(self) -> None:
        """
        데이터베이스 초기화 (모든 컬렉션 삭제)
        
        ⚠️ 주의: 되돌릴 수 없습니다!
        
        Example:
            >>> rag = RAGService()
            >>> rag.reset_database()  # 모든 데이터 삭제
        """
        try:
            collections = self.client.list_collections()
            
            for collection in collections:
                self.client.delete_collection(name=collection.name)
                logger.warning(f"🗑️ 컬렉션 삭제: {collection.name}")
            
            logger.warning("⚠️ 데이터베이스 초기화 완료")
            
        except Exception as e:
            logger.error(f"❌ 데이터베이스 초기화 실패: {e}")
            raise