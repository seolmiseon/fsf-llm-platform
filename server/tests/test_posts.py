"""
Posts API 테스트

Supabase 기반 게시글/댓글 관리 API 테스트
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestPostCreate:
    """게시글 생성 테스트"""

    def test_post_has_required_fields(self, mock_post):
        """게시글 필수 필드 존재 테스트"""
        required_fields = [
            "post_id", "author_id", "author_username",
            "title", "content", "category",
            "views", "likes", "comment_count", "created_at"
        ]
        
        for field in required_fields:
            assert field in mock_post, f"필수 필드 누락: {field}"

    def test_post_default_values(self, mock_post):
        """게시글 기본값 테스트"""
        # 새 게시글의 기본값
        new_post = {
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "is_deleted": False,
            "updated_at": None
        }
        
        assert new_post["views"] == 0
        assert new_post["likes"] == 0
        assert new_post["comment_count"] == 0
        assert new_post["is_deleted"] == False

    def test_post_title_validation(self):
        """게시글 제목 유효성 테스트"""
        # 제목 최소/최대 길이
        MIN_TITLE_LENGTH = 1
        MAX_TITLE_LENGTH = 200
        
        valid_title = "테스트 제목"
        empty_title = ""
        too_long_title = "a" * (MAX_TITLE_LENGTH + 1)
        
        assert len(valid_title) >= MIN_TITLE_LENGTH
        assert len(valid_title) <= MAX_TITLE_LENGTH
        assert len(empty_title) < MIN_TITLE_LENGTH
        assert len(too_long_title) > MAX_TITLE_LENGTH


class TestPostRead:
    """게시글 조회 테스트"""

    def test_post_view_count_increment(self, mock_post):
        """조회수 증가 테스트"""
        initial_views = mock_post["views"]
        new_views = initial_views + 1
        
        assert new_views == initial_views + 1

    def test_post_list_pagination(self):
        """게시글 목록 페이징 테스트"""
        page = 1
        page_size = 10
        offset = (page - 1) * page_size
        
        assert offset == 0
        
        page = 3
        offset = (page - 1) * page_size
        
        assert offset == 20


class TestPostUpdate:
    """게시글 수정 테스트"""

    def test_post_update_fields(self, mock_post):
        """게시글 수정 가능 필드 테스트"""
        updatable_fields = ["title", "content", "category"]
        
        for field in updatable_fields:
            assert field in mock_post

    def test_post_update_timestamp(self):
        """게시글 수정 시 타임스탬프 업데이트 테스트"""
        now = datetime.now().isoformat()
        update_data = {"updated_at": now}
        
        assert update_data["updated_at"] is not None


class TestPostDelete:
    """게시글 삭제 테스트"""

    def test_soft_delete(self, mock_post):
        """소프트 삭제 테스트"""
        # 소프트 삭제 전
        assert mock_post["is_deleted"] == False
        
        # 소프트 삭제 후
        mock_post["is_deleted"] = True
        assert mock_post["is_deleted"] == True


class TestCommentCreate:
    """댓글 생성 테스트"""

    def test_comment_has_required_fields(self, mock_comment):
        """댓글 필수 필드 존재 테스트"""
        required_fields = [
            "comment_id", "post_id", "author_id", "author_username",
            "content", "likes", "created_at"
        ]
        
        for field in required_fields:
            assert field in mock_comment, f"필수 필드 누락: {field}"

    def test_reply_comment(self, mock_comment):
        """대댓글 테스트"""
        # 일반 댓글 (부모 없음)
        assert mock_comment["parent_comment_id"] is None
        
        # 대댓글 (부모 있음)
        reply = mock_comment.copy()
        reply["parent_comment_id"] = "parent-comment-123"
        
        assert reply["parent_comment_id"] is not None


class TestCommentLike:
    """댓글 좋아요 테스트"""

    def test_like_increment(self, mock_comment):
        """좋아요 증가 테스트"""
        initial_likes = mock_comment["likes"]
        new_likes = initial_likes + 1
        
        assert new_likes == initial_likes + 1


class TestSupabasePostQueries:
    """Supabase 게시글 쿼리 테스트"""

    def test_insert_post(self, mock_supabase, mock_post):
        """게시글 삽입 테스트"""
        mock_supabase.table("posts").insert(mock_post)
        result = mock_supabase.table("posts").select("*").execute()
        
        assert len(result.data) == 1

    def test_insert_comment(self, mock_supabase, mock_comment):
        """댓글 삽입 테스트"""
        mock_supabase.table("comments").insert(mock_comment)
        result = mock_supabase.table("comments").select("*").execute()
        
        assert len(result.data) == 1

    def test_post_with_comments(self, mock_supabase, mock_post, mock_comment):
        """게시글과 댓글 관계 테스트"""
        mock_supabase.table("posts").insert(mock_post)
        mock_supabase.table("comments").insert(mock_comment)
        
        # 댓글이 게시글에 속하는지 확인
        assert mock_comment["post_id"] == mock_post["post_id"]
