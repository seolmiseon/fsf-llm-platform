"""
RAG 시스템 초기화 스크립트

Football-Data API에서 데이터를 수집해서 
ChromaDB에 벡터화해서 저장하는 스크립트

📖 실행 방법:
    cd ~/fsf-llm-platform/server
    python initialize_rag.py

⚠️ 주의:
    - OpenAI API 키 필요 (.env 파일)
    - Football-Data API 키 필요 (.env 파일)
    - 임베딩 생성 중 비용 발생 (매우 적음)
    - 첫 실행 시 5-10분 소요
"""

import asyncio
import logging
import sys
import os
from datetime import datetime
from pathlib import Path

# ============================================
# ⭐️ 환경 설정 (가장 먼저!)
# ============================================

# 1. 올바른 경로 설정
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)

print(f"🔧 작업 디렉토리 설정: {os.getcwd()}")

# 2. .env 파일 명시적으로 로드
from dotenv import load_dotenv

env_path = script_dir / ".env"
print(f"📁 .env 파일 경로: {env_path}")
print(f"   파일 존재: {'✅ 예' if env_path.exists() else '❌ 아니오'}")

loaded = load_dotenv(env_path)
print(f"📥 .env 로드: {'✅ 성공' if loaded else '⚠️ 찾지 못함 (기본값 사용)'}")

# 3. 환경변수 확인
print(f"\n🔑 환경변수 확인:")
print(f"   OPENAI_API_KEY: {'✅ 설정됨' if os.getenv('OPENAI_API_KEY') else '❌ 미설정'}")
print(f"   FOOTBALL_DATA_API_KEY: {'✅ 설정됨' if os.getenv('FOOTBALL_DATA_API_KEY') else '❌ 미설정'}")

# 4. 경로에 현재 디렉토리 추가 (import 때문에)
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

# ============================================
# 서비스 임포트
# ============================================

try:
    from llm_service.services.openai_service import OpenAIService
    from llm_service.services.rag_service import RAGService
    from llm_service.services.data_ingestion import DataIngestionService
    from llm_service.external_apis.football_data import FootballDataClient
    print("✅ 서비스 임포트 성공\n")
except ImportError as e:
    print(f"❌ 서비스 임포트 실패: {e}")
    sys.exit(1)

# ============================================
# 로깅 설정
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(script_dir / "rag_initialization.log")
    ]
)

logger = logging.getLogger(__name__)

# ============================================
# 1. 초기화 함수
# ============================================

def init_services():
    """
    모든 서비스 초기화
    
    Returns:
        (football_client, openai_service, rag_service, data_ingestion)
    """
    logger.info("=" * 60)
    logger.info("🚀 RAG 초기화 스크립트 시작")
    logger.info("=" * 60)
    
    try:
        logger.info("📦 서비스 초기화 중...")
        
        # 1. Football-Data API 클라이언트
        football_client = FootballDataClient()
        logger.info("✅ Football-Data 클라이언트 초기화")
        
        # 2. OpenAI 서비스
        openai_service = OpenAIService()
        logger.info("✅ OpenAI 서비스 초기화")
        
        # 3. RAG 서비스
        rag_service = RAGService()
        logger.info("✅ RAG 서비스 초기화")
        
        # 4. 데이터 수집 서비스
        data_ingestion = DataIngestionService(football_client, openai_service)
        logger.info("✅ 데이터 수집 서비스 초기화")
        
        logger.info("🎉 모든 서비스 초기화 완료!\n")
        
        return football_client, openai_service, rag_service, data_ingestion
        
    except Exception as e:
        logger.error(f"❌ 서비스 초기화 실패: {e}", exc_info=True)
        sys.exit(1)


async def load_matches_data(
    rag_service: RAGService,
    data_ingestion: DataIngestionService,
    competitions: list = ["PL", "LA", "BL"],
    days_back: int = 30,
    limit: int = 100
):
    """
    경기 데이터 수집 및 로드
    
    Args:
        rag_service: RAG 서비스
        data_ingestion: 데이터 수집 서비스
        competitions: 리그 코드
        days_back: 며칠 전까지의 경기
        limit: 최대 경기 수
    """
    logger.info("\n" + "=" * 60)
    logger.info("📊 경기 데이터 로드")
    logger.info("=" * 60)
    
    try:
        all_match_docs = []
        
        for comp in competitions:
            logger.info(f"\n🔄 {comp} 경기 수집 중... (최근 {days_back}일)")
            
            # 경기 데이터 수집
            match_docs = await data_ingestion.ingest_recent_matches(
                competition=comp,
                days_back=days_back,
                limit=limit
            )
            
            if match_docs:
                logger.info(f"✅ {comp}: {len(match_docs)}개 경기 수집")
                all_match_docs.extend(match_docs)
            else:
                logger.warning(f"⚠️ {comp}: 경기 데이터 없음")
        
        if all_match_docs:
            logger.info(f"\n📥 총 {len(all_match_docs)}개 경기를 ChromaDB에 저장 중...")
            
            # 문서, 메타데이터, ID 분리
            documents = [doc["document"] for doc in all_match_docs]
            metadatas = [doc["metadata"] for doc in all_match_docs]
            ids = [doc["id"] for doc in all_match_docs]
            
            # RAG에 저장
            rag_service.add_documents(
                collection_name="matches",
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ 경기 데이터 로드 완료!")
            logger.info(f"📊 현재 matches 컬렉션: {len(documents)}개 문서")
            
        else:
            logger.warning("⚠️ 로드할 경기 데이터가 없습니다")
            
    except Exception as e:
        logger.error(f"❌ 경기 데이터 로드 실패: {e}", exc_info=True)


async def load_standings_data(
    rag_service: RAGService,
    data_ingestion: DataIngestionService,
    competitions: list = ["PL", "LA", "BL"]
):
    """
    순위표 데이터 수집 및 로드
    
    Args:
        rag_service: RAG 서비스
        data_ingestion: 데이터 수집 서비스
        competitions: 리그 코드
    """
    logger.info("\n" + "=" * 60)
    logger.info("📊 순위표 데이터 로드")
    logger.info("=" * 60)
    
    try:
        logger.info(f"🔄 순위표 수집 중... ({', '.join(competitions)})")
        
        # 순위표 데이터 수집
        standing_docs = await data_ingestion.ingest_standings(competitions)
        
        if standing_docs:
            logger.info(f"✅ {len(standing_docs)}개 순위 데이터 수집")
            
            logger.info(f"📥 순위표를 ChromaDB에 저장 중...")
            
            # 문서, 메타데이터, ID 분리
            documents = [doc["document"] for doc in standing_docs]
            metadatas = [doc["metadata"] for doc in standing_docs]
            ids = [doc["id"] for doc in standing_docs]
            
            # RAG에 저장
            rag_service.add_documents(
                collection_name="standings",
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ 순위표 데이터 로드 완료!")
            logger.info(f"📊 현재 standings 컬렉션: {len(documents)}개 문서")
            
        else:
            logger.warning("⚠️ 로드할 순위표 데이터가 없습니다")
            
    except Exception as e:
        logger.error(f"❌ 순위표 데이터 로드 실패: {e}", exc_info=True)


async def load_teams_data(
    rag_service: RAGService,
    data_ingestion: DataIngestionService,
    competitions: list = ["PL"]
):
    """
    팀 정보 데이터 수집 및 로드
    
    Args:
        rag_service: RAG 서비스
        data_ingestion: 데이터 수집 서비스
        competitions: 리그 코드 (팀 정보는 리그별로 수집)
    """
    logger.info("\n" + "=" * 60)
    logger.info("⚽ 팀 정보 데이터 로드")
    logger.info("=" * 60)
    
    try:
        all_team_docs = []
        
        for comp in competitions:
            logger.info(f"\n🔄 {comp} 팀 정보 수집 중...")
            
            # 팀 정보 수집
            team_docs = await data_ingestion.ingest_teams(comp)
            
            if team_docs:
                logger.info(f"✅ {comp}: {len(team_docs)}개 팀 정보 수집")
                all_team_docs.extend(team_docs)
            else:
                logger.warning(f"⚠️ {comp}: 팀 정보 없음")
        
        if all_team_docs:
            logger.info(f"\n📥 총 {len(all_team_docs)}개 팀 정보를 ChromaDB에 저장 중...")
            
            # 문서, 메타데이터, ID 분리
            documents = [doc["document"] for doc in all_team_docs]
            metadatas = [doc["metadata"] for doc in all_team_docs]
            ids = [doc["id"] for doc in all_team_docs]
            
            # RAG에 저장
            rag_service.add_documents(
                collection_name="teams",
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ 팀 정보 데이터 로드 완료!")
            logger.info(f"📊 현재 teams 컬렉션: {len(documents)}개 문서")
            
        else:
            logger.warning("⚠️ 로드할 팀 정보 데이터가 없습니다")
            
    except Exception as e:
        logger.error(f"❌ 팀 정보 데이터 로드 실패: {e}", exc_info=True)


def print_summary(rag_service: RAGService):
    """
    초기화 완료 요약 출력
    
    Args:
        rag_service: RAG 서비스
    """
    logger.info("\n" + "=" * 60)
    logger.info("✅ RAG 초기화 완료!")
    logger.info("=" * 60)
    
    try:
        logger.info("\n📊 데이터 통계:")
        total_docs = 0
        
        # ChromaDB 컬렉션 통계
        collections_to_check = ["matches", "standings", "teams"]
        
        for collection_name in collections_to_check:
            try:
                stats = rag_service.get_collection_stats(collection_name)
                count = stats["count"]
                total_docs += count
                logger.info(f"  - {collection_name}: {count}개 문서")
            except:
                logger.info(f"  - {collection_name}: 데이터 없음")
        
        logger.info(f"\n📈 총 {total_docs}개 문서가 ChromaDB에 저장되었습니다.")
        
        logger.info("\n🧪 테스트 방법:")
        logger.info("  $ curl -X POST 'http://localhost:8000/api/llm/chat' \\")
        logger.info("      -H 'Content-Type: application/json' \\")
        logger.info("      -d '{\"query\": \"Arsenal 최근 경기\", \"top_k\": 5}'")
        
        logger.info("\n💾 데이터 저장 위치:")
        logger.info(f"  {rag_service.persist_dir}")
        
        logger.info("\n" + "=" * 60)
        
    except Exception as e:
        logger.error(f"❌ 요약 생성 실패: {e}")


# ============================================
# 2. 메인 함수
# ============================================

async def main():
    """
    RAG 초기화 메인 함수
    """
    start_time = datetime.now()
    
    try:
        # 1. 서비스 초기화
        football_client, openai_service, rag_service, data_ingestion = init_services()
        
        # 2. 데이터 로드
        await load_matches_data(rag_service, data_ingestion)
        await load_standings_data(rag_service, data_ingestion)
        await load_teams_data(rag_service, data_ingestion)
        
        # 3. 요약 출력
        print_summary(rag_service)
        
        # 소요 시간
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        logger.info(f"\n⏱️  소요 시간: {duration:.1f}초")
        
    except Exception as e:
        logger.error(f"❌ 초기화 실패: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())