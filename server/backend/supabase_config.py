"""
Supabase 클라이언트 설정

PostgreSQL 데이터베이스 연결 (Firestore 대체)
Firebase Auth는 그대로 유지
"""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase 클라이언트 인스턴스 (싱글톤)
_supabase_client: Client = None


def get_supabase_client() -> Client:
    """
    Supabase 클라이언트 반환 (싱글톤 패턴)
    
    Returns:
        Supabase Client 인스턴스
    
    Raises:
        Exception: 환경변수 미설정 시
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    # 환경변수에서 설정 로드
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("❌ SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.")
        raise Exception("Supabase credentials not configured")
    
    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase 클라이언트 초기화 성공")
        return _supabase_client
    except Exception as e:
        logger.error(f"❌ Supabase 클라이언트 초기화 실패: {e}")
        raise


def initialize_supabase():
    """
    앱 시작 시 Supabase 초기화 (선택적)
    """
    try:
        client = get_supabase_client()
        # 연결 테스트 - users 테이블에서 1개 조회
        result = client.table("users").select("uid").limit(1).execute()
        logger.info(f"✅ Supabase 연결 테스트 성공")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Supabase 초기화 실패 (선택적): {e}")
        return False
