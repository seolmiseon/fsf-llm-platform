"""
Backend Models - Pydantic 스키마
User, Post, Comment, Auth 관련 모델 정의

📖 Pydantic 문서: https://docs.pydantic.dev/
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============================================
# 1. User 관련 모델
# ============================================

class UserCreate(BaseModel):
    """회원가입 요청 모델"""
    email: EmailStr = Field(..., description="이메일", example="user@example.com")
    password: str = Field(..., min_length=6, description="비밀번호 (6자 이상)")
    username: str = Field(..., min_length=2, max_length=50, description="사용자명")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "password123",
                "username": "john_doe"
            }
        }


class UserLogin(BaseModel):
    """로그인 요청 모델"""
    email: EmailStr = Field(..., description="이메일")
    password: str = Field(..., description="비밀번호")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "password123"
            }
        }


class UserResponse(BaseModel):
    """사용자 응답 모델 (민감 정보 제외)"""
    uid: str = Field(..., description="Firebase UID")
    email: str = Field(..., description="이메일")
    username: str = Field(..., description="사용자명")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: Optional[datetime] = Field(default=None, description="수정 시간")
    
    class Config:
        json_schema_extra = {
            "example": {
                "uid": "abc123xyz",
                "email": "john@example.com",
                "username": "john_doe",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class UserUpdate(BaseModel):
    """사용자 정보 수정 모델 (기본)"""
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe_updated"
            }
        }


# ============================================
# 1-1. 확장된 유저 프로필 모델 (B2B 대비)
# ============================================

class UserProfileResponse(BaseModel):
    """
    공개 유저 프로필 응답 모델
    
    다른 유저가 조회할 수 있는 공개 정보
    B2B 파트너십을 위한 확장 가능한 구조
    """
    uid: str = Field(..., description="Firebase UID")
    username: str = Field(..., description="사용자명")
    created_at: datetime = Field(..., description="가입 시간")
    
    # === 확장 필드 (공개 프로필) ===
    bio: Optional[str] = Field(default=None, max_length=200, description="자기소개")
    profile_image: Optional[str] = Field(default=None, description="프로필 이미지 URL")
    favorite_team: Optional[str] = Field(default=None, description="선호 팀")
    favorite_league: Optional[str] = Field(default=None, description="선호 리그")
    
    # === 활동 통계 ===
    post_count: int = Field(default=0, description="작성 게시글 수")
    comment_count: int = Field(default=0, description="작성 댓글 수")
    
    # === 미래 확장용 (현재는 빈 배열) ===
    clubs: List[str] = Field(default=[], description="가입한 동호회 ID 목록")
    badges: List[str] = Field(default=[], description="획득한 배지 ID 목록")
    
    class Config:
        json_schema_extra = {
            "example": {
                "uid": "abc123xyz",
                "username": "john_doe",
                "created_at": "2025-01-15T10:30:00Z",
                "bio": "축구 좋아하는 직장인입니다",
                "profile_image": "https://example.com/profile.jpg",
                "favorite_team": "토트넘",
                "favorite_league": "EPL",
                "post_count": 15,
                "comment_count": 42,
                "clubs": [],
                "badges": []
            }
        }


class UserProfileUpdate(BaseModel):
    """
    유저 프로필 수정 요청 모델
    
    사용자가 자신의 프로필을 수정할 때 사용
    """
    username: Optional[str] = Field(default=None, min_length=2, max_length=50, description="사용자명")
    bio: Optional[str] = Field(default=None, max_length=200, description="자기소개")
    profile_image: Optional[str] = Field(default=None, description="프로필 이미지 URL")
    favorite_team: Optional[str] = Field(default=None, max_length=50, description="선호 팀")
    favorite_league: Optional[str] = Field(default=None, max_length=50, description="선호 리그")
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe_updated",
                "bio": "축구와 여행을 좋아합니다",
                "favorite_team": "토트넘",
                "favorite_league": "EPL"
            }
        }


class AuthResponse(BaseModel):
    """인증 응답 (JWT 토큰)"""
    access_token: str = Field(..., description="JWT 액세스 토큰")
    token_type: str = Field(default="bearer", description="토큰 타입")
    user: UserResponse = Field(..., description="사용자 정보")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "uid": "abc123xyz",
                    "email": "john@example.com",
                    "username": "john_doe"
                }
            }
        }


# ============================================
# 2. Post 관련 모델
# ============================================

class PostCreate(BaseModel):
    """게시글 작성 요청 모델"""
    title: str = Field(..., min_length=1, max_length=200, description="제목")
    content: str = Field(..., min_length=1, max_length=5000, description="내용")
    category: Optional[str] = Field(default="general", description="카테고리", example="축구분석")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Arsenal 이번 시즌 분석",
                "content": "Arsenal은 이번 시즌에 우수한 성적을...",
                "category": "축구분석"
            }
        }


class PostUpdate(BaseModel):
    """게시글 수정 요청 모델"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, min_length=1, max_length=5000)
    category: Optional[str] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Arsenal 이번 시즌 분석 (수정)",
                "content": "Arsenal은 이번 시즌에..."
            }
        }


class PostResponse(BaseModel):
    """게시글 응답 모델"""
    post_id: str = Field(..., description="게시글 ID")
    author_id: str = Field(..., description="작성자 UID")
    author_username: str = Field(..., description="작성자 이름")
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    category: str = Field(..., description="카테고리")
    views: int = Field(default=0, description="조회수")
    likes: int = Field(default=0, description="좋아요 수")
    comment_count: int = Field(default=0, description="댓글 수")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: Optional[datetime] = Field(default=None, description="수정 시간")
    
    class Config:
        json_schema_extra = {
            "example": {
                "post_id": "post123",
                "author_id": "uid123",
                "author_username": "john_doe",
                "title": "Arsenal 이번 시즌 분석",
                "content": "Arsenal은 이번 시즌에...",
                "category": "축구분석",
                "views": 156,
                "likes": 23,
                "comment_count": 5,
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class PostListResponse(BaseModel):
    """게시글 목록 응답"""
    posts: List[PostResponse] = Field(..., description="게시글 리스트")
    total_count: int = Field(..., description="총 게시글 수")
    page: int = Field(..., description="현재 페이지")
    page_size: int = Field(..., description="페이지당 개수")
    
    class Config:
        json_schema_extra = {
            "example": {
                "posts": [...],
                "total_count": 150,
                "page": 1,
                "page_size": 10
            }
        }


# ============================================
# 3. Comment 관련 모델
# ============================================

class CommentCreate(BaseModel):
    """댓글 작성 요청 모델"""
    content: str = Field(..., min_length=1, max_length=1000, description="댓글 내용")
    parent_comment_id: Optional[str] = Field(default=None, description="부모 댓글 ID (대댓글용)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "좋은 분석입니다!",
                "parent_comment_id": None
            }
        }


class CommentUpdate(BaseModel):
    """댓글 수정 요청 모델"""
    content: str = Field(..., min_length=1, max_length=1000, description="댓글 내용")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "수정된 댓글 내용입니다."
            }
        }


class CommentResponse(BaseModel):
    """댓글 응답 모델"""
    comment_id: str = Field(..., description="댓글 ID")
    post_id: str = Field(..., description="게시글 ID")
    author_id: str = Field(..., description="작성자 UID")
    author_username: str = Field(..., description="작성자 이름")
    content: str = Field(..., description="댓글 내용")
    likes: int = Field(default=0, description="좋아요 수")
    parent_comment_id: Optional[str] = Field(default=None, description="부모 댓글 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: Optional[datetime] = Field(default=None, description="수정 시간")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comment_id": "comment123",
                "post_id": "post123",
                "author_id": "uid123",
                "author_username": "jane_doe",
                "content": "좋은 분석입니다!",
                "likes": 3,
                "created_at": "2025-01-15T11:00:00Z"
            }
        }


class CommentListResponse(BaseModel):
    """댓글 목록 응답 (계층 구조 포함)"""
    comments: list[CommentResponse] = Field(..., description="댓글 목록")
    total_count: int = Field(..., description="전체 댓글 수")
    
    class Config:
        json_schema_extra = {
            "example": {
                "comments": [],
                "total_count": 10
            }
        }


# ============================================
# 4. Football Data 관련 모델
# ============================================

class StandingsResponse(BaseModel):
    """순위표 응답"""
    competition: str = Field(..., description="리그명", example="프리미어리그")
    standings: List[dict] = Field(..., description="순위 데이터")
    updated_at: datetime = Field(default_factory=datetime.now)


class MatchResponse(BaseModel):
    """경기 정보 응답"""
    match_id: int = Field(..., description="경기 ID")
    home_team: str = Field(..., description="홈팀")
    away_team: str = Field(..., description="어웨이팀")
    score: dict = Field(..., description="스코어 {'home': 3, 'away': 1}")
    status: str = Field(..., description="경기 상태 (FINISHED, LIVE, SCHEDULED)")
    date: datetime = Field(..., description="경기 일시")


# ============================================
# 5. 에러/상태 모델
# ============================================

class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str = Field(..., description="에러 메시지")
    error_code: str = Field(..., description="에러 코드")
    details: Optional[dict] = Field(default=None, description="상세 정보")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "User already exists",
                "error_code": "USER_EXISTS",
                "details": {"email": "user@example.com"}
            }
        }


class MessageResponse(BaseModel):
    """메시지 응답"""
    message: str = Field(..., description="메시지")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "작업이 완료되었습니다."
            }
        }


# ============================================
# 6. Firestore 문서 모델 (내부용)
# ============================================

class UserDocument(BaseModel):
    """
    Firestore User 문서 (확장된 구조)
    
    B2B 파트너십 및 미래 기능 확장을 위한 필드 포함
    """
    uid: str
    email: str
    username: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    is_admin: bool = False
    
    # === 확장 필드 (프로필) ===
    bio: Optional[str] = None                    # 자기소개
    profile_image: Optional[str] = None          # 프로필 이미지 URL
    favorite_team: Optional[str] = None          # 선호 팀
    favorite_league: Optional[str] = None        # 선호 리그
    
    # === 활동 통계 (캐싱용) ===
    post_count: int = 0                          # 작성 게시글 수
    comment_count: int = 0                       # 작성 댓글 수
    
    # === 미래 확장용 ===
    clubs: List[str] = []                        # 가입한 동호회 ID 목록
    badges: List[str] = []                       # 획득한 배지 ID 목록
    preferences: dict = {}                       # 기타 설정 (알림, 테마 등)
    
    # === B2B 연동용 (미래) ===
    connected_services: dict = {}                # 연결된 외부 서비스 (티켓사, 여행사 등)
    marketing_consent: bool = False              # 마케팅 동의 여부
    
    class Config:
        from_attributes = True


class PostDocument(BaseModel):
    """Firestore Post 문서"""
    post_id: str
    author_id: str
    author_username: str
    title: str
    content: str
    category: str = "general"
    views: int = 0
    likes: int = 0
    comment_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CommentDocument(BaseModel):
    """Firestore Comment 문서"""
    comment_id: str
    post_id: str
    author_id: str
    author_username: str
    content: str
    likes: int = 0
    parent_comment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# 7. 신고/경고/정지 시스템 모델
# ============================================

class ReportCategory(str, Enum):
    """신고 카테고리"""
    PROFANITY = "profanity"          # 욕설/비속어
    HARASSMENT = "harassment"         # 괴롭힘/따돌림
    HATE_SPEECH = "hate_speech"       # 혐오 발언
    SPAM = "spam"                     # 스팸/광고
    INAPPROPRIATE = "inappropriate"   # 부적절한 내용
    PERSONAL_INFO = "personal_info"   # 개인정보 노출
    OTHER = "other"                   # 기타


class ReportStatus(str, Enum):
    """신고 처리 상태"""
    PENDING = "pending"       # 대기 중
    REVIEWING = "reviewing"   # 검토 중
    RESOLVED = "resolved"     # 처리 완료
    DISMISSED = "dismissed"   # 기각 (무혐의)


class ReportTargetType(str, Enum):
    """신고 대상 유형"""
    POST = "post"
    COMMENT = "comment"
    USER = "user"


class ReportCreate(BaseModel):
    """신고 생성 요청"""
    target_type: ReportTargetType = Field(..., description="신고 대상 유형")
    target_id: str = Field(..., description="신고 대상 ID")
    category: ReportCategory = Field(..., description="신고 카테고리")
    reason: str = Field(..., min_length=10, max_length=500, description="신고 사유 (10자 이상)")

    class Config:
        json_schema_extra = {
            "example": {
                "target_type": "post",
                "target_id": "post123",
                "category": "profanity",
                "reason": "게시글에 심한 욕설이 포함되어 있습니다."
            }
        }


class ReportResponse(BaseModel):
    """신고 응답"""
    report_id: str = Field(..., description="신고 ID")
    reporter_id: str = Field(..., description="신고자 ID")
    reporter_username: str = Field(..., description="신고자 이름")
    target_type: ReportTargetType = Field(..., description="대상 유형")
    target_id: str = Field(..., description="대상 ID")
    target_author_id: Optional[str] = Field(default=None, description="대상 작성자 ID")
    category: ReportCategory = Field(..., description="신고 카테고리")
    reason: str = Field(..., description="신고 사유")
    status: ReportStatus = Field(default=ReportStatus.PENDING, description="처리 상태")
    admin_note: Optional[str] = Field(default=None, description="관리자 메모")
    created_at: datetime = Field(..., description="신고 시간")
    resolved_at: Optional[datetime] = Field(default=None, description="처리 시간")

    class Config:
        json_schema_extra = {
            "example": {
                "report_id": "report123",
                "reporter_id": "user456",
                "reporter_username": "john_doe",
                "target_type": "post",
                "target_id": "post123",
                "target_author_id": "user789",
                "category": "profanity",
                "reason": "게시글에 심한 욕설이 포함되어 있습니다.",
                "status": "pending",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class ReportListResponse(BaseModel):
    """신고 목록 응답"""
    reports: List[ReportResponse] = Field(..., description="신고 목록")
    total_count: int = Field(..., description="전체 신고 수")
    page: int = Field(..., description="현재 페이지")
    page_size: int = Field(..., description="페이지당 개수")


class ReportAction(BaseModel):
    """관리자 신고 처리 요청"""
    status: ReportStatus = Field(..., description="처리 상태")
    admin_note: Optional[str] = Field(default=None, max_length=500, description="관리자 메모")
    issue_warning: bool = Field(default=False, description="경고 발급 여부")
    warning_severity: Optional[int] = Field(default=1, ge=1, le=3, description="경고 수준 (1-3)")
    delete_content: bool = Field(default=False, description="콘텐츠 삭제 여부")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "resolved",
                "admin_note": "욕설 확인, 경고 발급",
                "issue_warning": True,
                "warning_severity": 1,
                "delete_content": True
            }
        }


class WarningResponse(BaseModel):
    """경고 응답"""
    warning_id: str = Field(..., description="경고 ID")
    user_id: str = Field(..., description="대상 유저 ID")
    username: str = Field(..., description="대상 유저 이름")
    reason: str = Field(..., description="경고 사유")
    severity: int = Field(..., ge=1, le=3, description="경고 수준 (1: 주의, 2: 경고, 3: 강한 경고)")
    related_report_id: Optional[str] = Field(default=None, description="관련 신고 ID")
    issued_by: str = Field(..., description="발급 관리자 ID")
    created_at: datetime = Field(..., description="발급 시간")
    expires_at: Optional[datetime] = Field(default=None, description="만료 시간")

    class Config:
        json_schema_extra = {
            "example": {
                "warning_id": "warning123",
                "user_id": "user789",
                "username": "bad_user",
                "reason": "욕설 사용",
                "severity": 1,
                "related_report_id": "report123",
                "issued_by": "admin001",
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


class UserWarningStatus(BaseModel):
    """유저 경고 현황"""
    user_id: str = Field(..., description="유저 ID")
    username: str = Field(..., description="유저 이름")
    total_warnings: int = Field(default=0, description="총 경고 횟수")
    active_warnings: int = Field(default=0, description="유효한 경고 횟수")
    is_banned: bool = Field(default=False, description="정지 여부")
    ban_expires_at: Optional[datetime] = Field(default=None, description="정지 해제 시간")
    warnings: List[WarningResponse] = Field(default=[], description="경고 내역")