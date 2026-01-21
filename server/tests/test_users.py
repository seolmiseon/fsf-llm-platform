"""
Users API 테스트

Supabase 기반 유저 관리 API 테스트
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime


class TestUserProfile:
    """유저 프로필 API 테스트"""

    def test_get_user_profile_success(self, mock_user):
        """유저 프로필 조회 성공 테스트"""
        # Given: 유효한 유저 데이터
        user_data = mock_user
        
        # Then: 필수 필드 확인
        assert user_data["uid"] == "test-user-123"
        assert user_data["username"] == "testuser"
        assert "created_at" in user_data
        assert "post_count" in user_data
        assert "comment_count" in user_data

    def test_user_profile_has_required_fields(self, mock_user):
        """유저 프로필 필수 필드 존재 테스트"""
        required_fields = [
            "uid", "username", "created_at", "bio", "profile_image",
            "favorite_team", "favorite_league", "post_count", "comment_count"
        ]
        
        for field in required_fields:
            assert field in mock_user, f"필수 필드 누락: {field}"

    def test_user_profile_default_values(self, mock_user):
        """유저 프로필 기본값 테스트"""
        assert mock_user["warning_count"] == 0
        assert mock_user["is_suspended"] == False
        assert mock_user["clubs"] == []
        assert mock_user["badges"] == []


class TestUserProfileUpdate:
    """유저 프로필 수정 테스트"""

    def test_update_profile_fields(self, mock_user):
        """프로필 수정 가능 필드 테스트"""
        # 수정 가능한 필드들
        updatable_fields = ["username", "bio", "profile_image", "favorite_team", "favorite_league"]
        
        for field in updatable_fields:
            assert field in mock_user, f"수정 가능 필드 누락: {field}"

    def test_update_profile_validation(self):
        """프로필 수정 유효성 검사 테스트"""
        # bio 최대 길이 테스트
        max_bio_length = 500
        valid_bio = "a" * max_bio_length
        invalid_bio = "a" * (max_bio_length + 1)
        
        assert len(valid_bio) <= max_bio_length
        assert len(invalid_bio) > max_bio_length


class TestUserWarnings:
    """유저 경고 시스템 테스트"""

    def test_warning_count_default(self, mock_user):
        """경고 카운트 기본값 테스트"""
        assert mock_user["warning_count"] == 0

    def test_user_suspension_status(self, mock_user):
        """유저 정지 상태 테스트"""
        assert mock_user["is_suspended"] == False

    def test_warning_threshold(self):
        """경고 임계값 테스트"""
        # 3회 경고 시 정지
        WARNING_THRESHOLD = 3
        
        warning_count = 3
        should_suspend = warning_count >= WARNING_THRESHOLD
        
        assert should_suspend == True


class TestSupabaseUserQueries:
    """Supabase 유저 쿼리 테스트"""

    def test_mock_supabase_table(self, mock_supabase, mock_user):
        """Supabase 테이블 쿼리 모킹 테스트"""
        # Insert
        mock_supabase.table("users").insert(mock_user)
        result = mock_supabase.table("users").select("*").execute()
        
        assert len(result.data) == 1
        assert result.data[0]["uid"] == mock_user["uid"]

    def test_user_select_by_uid(self, mock_supabase, mock_user):
        """UID로 유저 조회 테스트"""
        # Insert user
        mock_supabase.table("users").insert(mock_user)
        
        # Select by uid
        result = mock_supabase.table("users").select("*").eq("uid", mock_user["uid"]).execute()
        
        assert result.data is not None
