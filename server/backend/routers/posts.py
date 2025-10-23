"""
Backend Posts 라우터 - 게시글 CRUD 및 댓글

Firestore를 사용한 게시글 관리 시스템

📖 Firestore Transactions: https://firebase.google.com/docs/firestore/transactions
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from firebase_admin import firestore
import uuid

from .backend_models import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    CommentCreate, CommentResponse, UserResponse, MessageResponse
)
from .backend_dependencies import (
    get_current_user, get_firestore_db, handle_firestore_error, get_optional_user
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["Posts"])


# ============================================
# 1. 게시글 생성 (Create Post)
# ============================================

@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "게시글 생성 성공"},
        400: {"model": dict, "description": "잘못된 요청"},
        401: {"model": dict, "description": "인증 필요"},
        500: {"model": dict, "description": "서버 오류"},
    }
)
async def create_post(
    post_data: PostCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> PostResponse:
    """
    새 게시글 작성
    
    Args:
        post_data: 게시글 정보 (title, content, category)
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        PostResponse: 생성된 게시글
    
    Example:
        >>> POST /api/posts
        >>> Authorization: Bearer <token>
        >>> {
        >>>   "title": "Arsenal 분석",
        >>>   "content": "Arsenal은...",
        >>>   "category": "축구분석"
        >>> }
    """
    try:
        logger.info(f"📝 게시글 생성: {current_user.username}")
        
        # 게시글 ID 생성
        post_id = str(uuid.uuid4())[:8]
        now = datetime.now()
        
        # Firestore 문서 생성
        post_doc = {
            "post_id": post_id,
            "author_id": current_user.uid,
            "author_username": current_user.username,
            "title": post_data.title,
            "content": post_data.content,
            "category": post_data.category or "general",
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "created_at": now,
            "updated_at": None
        }
        
        db.collection("posts").document(post_id).set(post_doc)
        logger.info(f"✅ 게시글 생성 완료: {post_id}")
        
        return PostResponse(
            post_id=post_id,
            author_id=current_user.uid,
            author_username=current_user.username,
            title=post_data.title,
            content=post_data.content,
            category=post_data.category or "general",
            views=0,
            likes=0,
            comment_count=0,
            created_at=now
        )
        
    except Exception as e:
        logger.error(f"❌ 게시글 생성 실패: {e}", exc_info=True)
        raise handle_firestore_error(e)


# ============================================
# 2. 게시글 목록 조회 (Get Posts)
# ============================================

@router.get(
    "",
    response_model=PostListResponse,
    status_code=status.HTTP_200_OK
)
async def get_posts(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(10, ge=1, le=100, description="페이지당 개수"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    db: firestore.client = Depends(get_firestore_db),
    current_user: Optional[UserResponse] = Depends(get_optional_user)
) -> PostListResponse:
    """
    게시글 목록 조회 (페이징)
    
    Args:
        page: 페이지 번호 (기본값: 1)
        page_size: 페이지당 개수 (기본값: 10, 최대: 100)
        category: 카테고리 필터 (선택)
        db: Firestore 클라이언트
        current_user: 현재 사용자 (선택)
    
    Returns:
        PostListResponse: 게시글 목록
    
    Example:
        >>> GET /api/posts?page=1&page_size=10&category=축구분석
    """
    try:
        logger.info(f"📖 게시글 목록 조회: page={page}, size={page_size}")
        
        # 쿼리 생성
        query = db.collection("posts").order_by("created_at", direction=firestore.Query.DESCENDING)
        
        # 카테고리 필터
        if category:
            query = query.where("category", "==", category)
        
        # 전체 개수 조회
        total_count = len(list(query.stream()))
        
        # 페이징 적용
        offset = (page - 1) * page_size
        posts_docs = list(query.offset(offset).limit(page_size).stream())
        
        # PostResponse 리스트 생성
        posts = [
            PostResponse(
                post_id=doc.get("post_id"),
                author_id=doc.get("author_id"),
                author_username=doc.get("author_username"),
                title=doc.get("title"),
                content=doc.get("content"),
                category=doc.get("category"),
                views=doc.get("views", 0),
                likes=doc.get("likes", 0),
                comment_count=doc.get("comment_count", 0),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
            for doc in posts_docs
        ]
        
        logger.info(f"✅ {len(posts)}개 게시글 조회")
        
        return PostListResponse(
            posts=posts,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"❌ 게시글 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch posts"
        )


# ============================================
# 3. 게시글 상세 조회 (Get Post)
# ============================================

@router.get(
    "/{post_id}",
    response_model=PostResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "게시글 정보"},
        404: {"model": dict, "description": "게시글 미발견"},
    }
)
async def get_post(
    post_id: str,
    db: firestore.client = Depends(get_firestore_db)
) -> PostResponse:
    """
    게시글 상세 조회 (조회수 증가)
    
    Args:
        post_id: 게시글 ID
        db: Firestore 클라이언트
    
    Returns:
        PostResponse: 게시글 정보
    
    Example:
        >>> GET /api/posts/abc123
    """
    try:
        logger.info(f"📖 게시글 조회: {post_id}")
        
        post_doc = db.collection("posts").document(post_id).get()
        
        if not post_doc.exists:
            logger.warning(f"⚠️ 게시글 미발견: {post_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post_data = post_doc.to_dict()
        
        # 조회수 증가
        new_views = post_data.get("views", 0) + 1
        db.collection("posts").document(post_id).update({"views": new_views})
        post_data["views"] = new_views
        
        return PostResponse(
            post_id=post_data.get("post_id"),
            author_id=post_data.get("author_id"),
            author_username=post_data.get("author_username"),
            title=post_data.get("title"),
            content=post_data.get("content"),
            category=post_data.get("category"),
            views=new_views,
            likes=post_data.get("likes", 0),
            comment_count=post_data.get("comment_count", 0),
            created_at=post_data.get("created_at"),
            updated_at=post_data.get("updated_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 게시글 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch post"
        )


# ============================================
# 4. 게시글 수정 (Update Post)
# ============================================

@router.put(
    "/{post_id}",
    response_model=PostResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "수정 성공"},
        401: {"model": dict, "description": "권한 없음"},
        404: {"model": dict, "description": "게시글 미발견"},
    }
)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> PostResponse:
    """
    게시글 수정 (작성자만 가능)
    
    Args:
        post_id: 게시글 ID
        post_data: 수정할 정보
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        PostResponse: 수정된 게시글
    
    Example:
        >>> PUT /api/posts/abc123
        >>> Authorization: Bearer <token>
        >>> {
        >>>   "title": "수정된 제목",
        >>>   "content": "수정된 내용"
        >>> }
    """
    try:
        logger.info(f"✏️ 게시글 수정: {post_id}")
        
        # 게시글 조회
        post_doc = db.collection("posts").document(post_id).get()
        
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post = post_doc.to_dict()
        
        # 작성자 확인
        if post.get("author_id") != current_user.uid:
            logger.warning(f"⚠️ 권한 없음: {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this post"
            )
        
        # 수정 데이터 준비
        update_dict = {}
        if post_data.title is not None:
            update_dict["title"] = post_data.title
        if post_data.content is not None:
            update_dict["content"] = post_data.content
        if post_data.category is not None:
            update_dict["category"] = post_data.category
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_dict["updated_at"] = datetime.now()
        
        # Firestore 업데이트
        db.collection("posts").document(post_id).update(update_dict)
        
        logger.info(f"✅ 게시글 수정 완료: {post_id}")
        
        # 수정된 데이터 반환
        updated_post = post.copy()
        updated_post.update(update_dict)
        
        return PostResponse(
            post_id=updated_post.get("post_id"),
            author_id=updated_post.get("author_id"),
            author_username=updated_post.get("author_username"),
            title=updated_post.get("title"),
            content=updated_post.get("content"),
            category=updated_post.get("category"),
            views=updated_post.get("views", 0),
            likes=updated_post.get("likes", 0),
            comment_count=updated_post.get("comment_count", 0),
            created_at=updated_post.get("created_at"),
            updated_at=updated_post.get("updated_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 게시글 수정 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update post"
        )


# ============================================
# 5. 게시글 삭제 (Delete Post)
# ============================================

@router.delete(
    "/{post_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "삭제 성공"},
        401: {"model": dict, "description": "권한 없음"},
        404: {"model": dict, "description": "게시글 미발견"},
    }
)
async def delete_post(
    post_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> MessageResponse:
    """
    게시글 삭제 (작성자만 가능)
    
    Args:
        post_id: 게시글 ID
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        MessageResponse: 삭제 메시지
    
    Example:
        >>> DELETE /api/posts/abc123
        >>> Authorization: Bearer <token>
    """
    try:
        logger.info(f"🗑️ 게시글 삭제: {post_id}")
        
        post_doc = db.collection("posts").document(post_id).get()
        
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post = post_doc.to_dict()
        
        # 작성자 확인
        if post.get("author_id") != current_user.uid:
            logger.warning(f"⚠️ 권한 없음: {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this post"
            )
        
        # 게시글 삭제
        db.collection("posts").document(post_id).delete()
        
        # 관련 댓글도 삭제 (트랜잭션으로 개선 가능)
        comments = db.collection("comments").where("post_id", "==", post_id).stream()
        for comment in comments:
            comment.reference.delete()
        
        logger.info(f"✅ 게시글 삭제 완료: {post_id}")
        
        return MessageResponse(message="Post deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 게시글 삭제 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete post"
        )


# ============================================
# 6. 댓글 추가 (Add Comment)
# ============================================

@router.post(
    "/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_comment(
    post_id: str,
    comment_data: CommentCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> CommentResponse:
    """
    게시글에 댓글 추가
    
    Args:
        post_id: 게시글 ID
        comment_data: 댓글 정보
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        CommentResponse: 생성된 댓글
    
    Example:
        >>> POST /api/posts/abc123/comments
        >>> Authorization: Bearer <token>
        >>> {
        >>>   "content": "좋은 분석입니다!"
        >>> }
    """
    try:
        logger.info(f"💬 댓글 추가: {post_id}")
        
        # 게시글 존재 확인
        post_doc = db.collection("posts").document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # 댓글 ID 생성
        comment_id = str(uuid.uuid4())[:8]
        now = datetime.now()
        
        comment_doc = {
            "comment_id": comment_id,
            "post_id": post_id,
            "author_id": current_user.uid,
            "author_username": current_user.username,
            "content": comment_data.content,
            "likes": 0,
            "parent_comment_id": comment_data.parent_comment_id,
            "created_at": now,
            "updated_at": None
        }
        
        # 댓글 저장
        db.collection("comments").document(comment_id).set(comment_doc)
        
        # 게시글의 댓글 수 증가
        post_data = post_doc.to_dict()
        new_count = post_data.get("comment_count", 0) + 1
        db.collection("posts").document(post_id).update({"comment_count": new_count})
        
        logger.info(f"✅ 댓글 추가 완료: {comment_id}")
        
        return CommentResponse(
            comment_id=comment_id,
            post_id=post_id,
            author_id=current_user.uid,
            author_username=current_user.username,
            content=comment_data.content,
            likes=0,
            parent_comment_id=comment_data.parent_comment_id,
            created_at=now
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 댓글 추가 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add comment"
        )


# ============================================
# 7. 댓글 목록 조회 (Get Comments)
# ============================================

@router.get(
    "/{post_id}/comments",
    response_model=list[CommentResponse],
    status_code=status.HTTP_200_OK
)
async def get_comments(
    post_id: str,
    db: firestore.client = Depends(get_firestore_db)
) -> list[CommentResponse]:
    """
    게시글의 댓글 목록 조회
    
    Args:
        post_id: 게시글 ID
        db: Firestore 클라이언트
    
    Returns:
        댓글 리스트
    
    Example:
        >>> GET /api/posts/abc123/comments
    """
    try:
        logger.info(f"💬 댓글 목록 조회: {post_id}")
        
        comments_docs = db.collection("comments").where(
            "post_id", "==", post_id
        ).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        
        comments = [
            CommentResponse(
                comment_id=doc.get("comment_id"),
                post_id=doc.get("post_id"),
                author_id=doc.get("author_id"),
                author_username=doc.get("author_username"),
                content=doc.get("content"),
                likes=doc.get("likes", 0),
                parent_comment_id=doc.get("parent_comment_id"),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
            for doc in comments_docs
        ]
        
        logger.info(f"✅ {len(comments)}개 댓글 조회")
        return comments
        
    except Exception as e:
        logger.error(f"❌ 댓글 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch comments"
        )


# ============================================
# 8. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def posts_health():
    """Posts 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "posts",
        "timestamp": datetime.now().isoformat()
    }