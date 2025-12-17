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
    """사용자 정보 수정 모델"""
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe_updated"
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
    """Firestore User 문서"""
    uid: str
    email: str
    username: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    
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