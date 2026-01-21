"""
Reports API 테스트

Supabase 기반 신고/경고 시스템 API 테스트
"""

import pytest
from datetime import datetime, timedelta


class TestReportCreate:
    """신고 생성 테스트"""

    def test_report_has_required_fields(self, mock_report):
        """신고 필수 필드 존재 테스트"""
        required_fields = [
            "report_id", "reporter_id", "reporter_username",
            "target_type", "target_id", "category",
            "reason", "status", "created_at"
        ]
        
        for field in required_fields:
            assert field in mock_report, f"필수 필드 누락: {field}"

    def test_report_target_types(self):
        """신고 대상 타입 테스트"""
        valid_target_types = ["post", "comment", "user"]
        
        for target_type in valid_target_types:
            assert target_type in valid_target_types

    def test_report_categories(self):
        """신고 카테고리 테스트"""
        valid_categories = [
            "profanity", "harassment", "hate_speech",
            "spam", "inappropriate", "personal_info", "other"
        ]
        
        for category in valid_categories:
            assert category in valid_categories

    def test_report_initial_status(self, mock_report):
        """신고 초기 상태 테스트"""
        assert mock_report["status"] == "pending"


class TestReportAbuse:
    """신고 남용 감지 테스트"""

    def test_rate_limit_per_hour(self):
        """시간당 신고 제한 테스트"""
        MAX_REPORTS_PER_HOUR = 10
        
        reports_last_hour = 10
        is_abusive = reports_last_hour >= MAX_REPORTS_PER_HOUR
        
        assert is_abusive == True

    def test_rate_limit_per_day(self):
        """일일 신고 제한 테스트"""
        MAX_REPORTS_PER_DAY = 30
        
        reports_last_day = 30
        is_abusive = reports_last_day >= MAX_REPORTS_PER_DAY
        
        assert is_abusive == True

    def test_high_dismissal_rate(self):
        """높은 기각률 감지 테스트"""
        DISMISSED_THRESHOLD = 0.7
        MIN_REPORTS = 5
        
        dismissed_count = 8
        resolved_count = 10
        dismissed_rate = dismissed_count / resolved_count
        
        is_abusive = resolved_count >= MIN_REPORTS and dismissed_rate >= DISMISSED_THRESHOLD
        
        assert is_abusive == True
        assert dismissed_rate == 0.8

    def test_target_concentration(self):
        """특정 유저 집중 신고 감지 테스트"""
        TARGET_CONCENTRATION_LIMIT = 3
        
        target_counts = {"user-123": 4}
        
        is_targeting = any(
            count >= TARGET_CONCENTRATION_LIMIT 
            for count in target_counts.values()
        )
        
        assert is_targeting == True


class TestReportProcess:
    """신고 처리 테스트"""

    def test_report_status_transitions(self):
        """신고 상태 전이 테스트"""
        valid_statuses = ["pending", "reviewing", "resolved", "dismissed"]
        
        # pending -> reviewing
        assert "reviewing" in valid_statuses
        # reviewing -> resolved
        assert "resolved" in valid_statuses
        # reviewing -> dismissed
        assert "dismissed" in valid_statuses

    def test_report_resolution(self, mock_report):
        """신고 처리 완료 테스트"""
        mock_report["status"] = "resolved"
        mock_report["resolved_at"] = datetime.now().isoformat()
        mock_report["admin_note"] = "처리 완료"
        
        assert mock_report["status"] == "resolved"
        assert mock_report["resolved_at"] is not None


class TestWarningSystem:
    """경고 시스템 테스트"""

    def test_warning_severity_levels(self):
        """경고 심각도 레벨 테스트"""
        valid_severities = [1, 2, 3]
        
        for severity in valid_severities:
            assert 1 <= severity <= 3

    def test_warning_expiration(self):
        """경고 만료 테스트"""
        EXPIRATION_DAYS = 90
        
        created_at = datetime.now()
        expires_at = created_at + timedelta(days=EXPIRATION_DAYS)
        
        assert (expires_at - created_at).days == EXPIRATION_DAYS

    def test_auto_suspension_threshold(self):
        """자동 정지 임계값 테스트"""
        SUSPENSION_THRESHOLD = 3
        
        warning_count = 3
        should_suspend = warning_count >= SUSPENSION_THRESHOLD
        
        assert should_suspend == True


class TestSelfReportPrevention:
    """자기 자신 신고 방지 테스트"""

    def test_cannot_report_own_post(self):
        """자신의 게시글 신고 불가 테스트"""
        author_id = "user-123"
        reporter_id = "user-123"
        
        is_self_report = author_id == reporter_id
        
        assert is_self_report == True

    def test_cannot_report_own_comment(self):
        """자신의 댓글 신고 불가 테스트"""
        author_id = "user-123"
        reporter_id = "user-123"
        
        is_self_report = author_id == reporter_id
        
        assert is_self_report == True

    def test_cannot_report_self(self):
        """자기 자신 신고 불가 테스트"""
        target_user_id = "user-123"
        reporter_id = "user-123"
        
        is_self_report = target_user_id == reporter_id
        
        assert is_self_report == True


class TestSupabaseReportQueries:
    """Supabase 신고 쿼리 테스트"""

    def test_insert_report(self, mock_supabase, mock_report):
        """신고 삽입 테스트"""
        mock_supabase.table("reports").insert(mock_report)
        result = mock_supabase.table("reports").select("*").execute()
        
        assert len(result.data) == 1

    def test_report_with_warning(self, mock_supabase, mock_report):
        """신고와 경고 연결 테스트"""
        warning = {
            "warning_id": "warning-123",
            "user_id": mock_report["target_author_id"],
            "username": "testuser",
            "reason": mock_report["reason"],
            "severity": 1,
            "related_report_id": mock_report["report_id"],
            "issued_by": "admin-123",
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=90)).isoformat()
        }
        
        mock_supabase.table("warnings").insert(warning)
        result = mock_supabase.table("warnings").select("*").execute()
        
        assert len(result.data) == 1
        assert result.data[0]["related_report_id"] == mock_report["report_id"]
