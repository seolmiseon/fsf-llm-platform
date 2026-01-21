"""
pytest 공통 설정 및 fixtures

Supabase 테스트용 설정
"""

import os
import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime

# 환경변수 설정 (테스트용)
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")


# ============================================
# Mock Supabase Client
# ============================================

class MockSupabaseResponse:
    """Supabase 응답 모킹"""
    def __init__(self, data=None, count=None, error=None):
        self.data = data or []
        self.count = count
        self.error = error


class MockSupabaseTable:
    """Supabase 테이블 쿼리 모킹"""
    def __init__(self, data=None):
        self._data = data or []
        self._filters = {}
    
    def select(self, *args, **kwargs):
        return self
    
    def insert(self, data):
        self._data.append(data)
        return self
    
    def update(self, data):
        return self
    
    def delete(self):
        return self
    
    def eq(self, field, value):
        return self
    
    def order(self, field, **kwargs):
        return self
    
    def range(self, start, end):
        return self
    
    def execute(self):
        return MockSupabaseResponse(data=self._data, count=len(self._data))


class MockSupabaseClient:
    """Supabase 클라이언트 모킹"""
    def __init__(self):
        self._tables = {}
    
    def table(self, name):
        if name not in self._tables:
            self._tables[name] = MockSupabaseTable()
        return self._tables[name]
    
    def rpc(self, name, params=None):
        return MockSupabaseTable()


@pytest.fixture
def mock_supabase():
    """Mock Supabase 클라이언트 fixture"""
    return MockSupabaseClient()


@pytest.fixture
def mock_user():
    """테스트용 유저 데이터"""
    return {
        "uid": "test-user-123",
        "username": "testuser",
        "email": "test@example.com",
        "created_at": datetime.now().isoformat(),
        "bio": "테스트 유저입니다",
        "profile_image": None,
        "favorite_team": "토트넘",
        "favorite_league": "EPL",
        "post_count": 5,
        "comment_count": 10,
        "warning_count": 0,
        "is_suspended": False,
        "clubs": [],
        "badges": []
    }


@pytest.fixture
def mock_post():
    """테스트용 게시글 데이터"""
    return {
        "post_id": "test-post-123",
        "author_id": "test-user-123",
        "author_username": "testuser",
        "title": "테스트 게시글",
        "content": "테스트 내용입니다.",
        "category": "general",
        "views": 10,
        "likes": 5,
        "comment_count": 3,
        "is_deleted": False,
        "created_at": datetime.now().isoformat(),
        "updated_at": None
    }


@pytest.fixture
def mock_comment():
    """테스트용 댓글 데이터"""
    return {
        "comment_id": "test-comment-123",
        "post_id": "test-post-123",
        "author_id": "test-user-123",
        "author_username": "testuser",
        "content": "테스트 댓글입니다.",
        "likes": 2,
        "parent_comment_id": None,
        "is_deleted": False,
        "created_at": datetime.now().isoformat(),
        "updated_at": None
    }


@pytest.fixture
def mock_report():
    """테스트용 신고 데이터"""
    return {
        "report_id": "test-report-123",
        "reporter_id": "reporter-123",
        "reporter_username": "reporter",
        "target_type": "post",
        "target_id": "test-post-123",
        "target_author_id": "test-user-123",
        "category": "spam",
        "reason": "스팸 게시글입니다",
        "status": "pending",
        "admin_note": None,
        "created_at": datetime.now().isoformat(),
        "resolved_at": None
    }


# ============================================
# FastAPI TestClient 설정
# ============================================

@pytest.fixture
def test_client():
    """FastAPI TestClient fixture"""
    from fastapi.testclient import TestClient
    from main import app
    
    return TestClient(app)


# ============================================
# 인증 모킹
# ============================================

@pytest.fixture
def auth_headers():
    """테스트용 인증 헤더"""
    return {"Authorization": "Bearer test-token-123"}
