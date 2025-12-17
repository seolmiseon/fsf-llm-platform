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

from ..models import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    CommentCreate, CommentUpdate, CommentResponse, CommentListResponse,
    UserResponse, MessageResponse
)
from ..dependencies import (
    get_current_user, get_firestore_db, handle_firestore_error, get_optional_user
)

# ✅ 커뮤니티용 텍스트 필터링 (욕설/스팸/유해 내용 방지)
try:
    from llm_service.services.content_safety_service import ContentSafetyService

    content_safety_service = ContentSafetyService()
    logging.getLogger(__name__).info("✅ ContentSafetyService 초기화 완료 (커뮤니티용 필터링)")
except Exception as e:
    content_safety_service = None
    logging.getLogger(__name__).warning(
        f"⚠️ ContentSafetyService 초기화 실패 (커뮤니티 필터링 비활성화): {e}"
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
        
        # 🔒 콘텐츠 필터링 (제목 + 내용)
        if content_safety_service:
            text_to_check = f"{post_data.title}\n{post_data.content}"
            check_result = content_safety_service.check_input(text_to_check)
            if not check_result.is_safe:
                logger.warning(
                    "🚫 게시글 내용에 유해 콘텐츠 감지: "
                    f"카테고리={check_result.category}, "
                    f"단어={check_result.detected_words}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "부적절한 내용이 포함된 게시글입니다.",
                        "error_code": "INAPPROPRIATE_CONTENT",
                        "category": check_result.category.value if check_result.category else None,
                        "reason": check_result.reason,
                    },
                )
        
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
        new_title = post_data.title if post_data.title is not None else post.get("title")
        new_content = post_data.content if post_data.content is not None else post.get("content")

        # 🔒 콘텐츠 필터링 (수정 후 제목 + 내용)
        if content_safety_service and (post_data.title is not None or post_data.content is not None):
            text_to_check = f"{new_title}\n{new_content}"
            check_result = content_safety_service.check_input(text_to_check)
            if not check_result.is_safe:
                logger.warning(
                    "🚫 게시글 수정 내용에 유해 콘텐츠 감지: "
                    f"카테고리={check_result.category}, "
                    f"단어={check_result.detected_words}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "부적절한 내용이 포함된 게시글입니다.",
                        "error_code": "INAPPROPRIATE_CONTENT",
                        "category": check_result.category.value if check_result.category else None,
                        "reason": check_result.reason,
                    },
                )

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
        
        # 🔒 댓글 콘텐츠 필터링
        if content_safety_service:
            check_result = content_safety_service.check_input(comment_data.content)
            if not check_result.is_safe:
                logger.warning(
                    "🚫 댓글 내용에 유해 콘텐츠 감지: "
                    f"카테고리={check_result.category}, "
                    f"단어={check_result.detected_words}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "부적절한 내용이 포함된 댓글입니다.",
                        "error_code": "INAPPROPRIATE_CONTENT",
                        "category": check_result.category.value if check_result.category else None,
                        "reason": check_result.reason,
                    },
                )
        
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
        
        # 알림 생성 (대댓글이 아닌 경우에만 게시글 작성자에게 알림)
        if not comment_data.parent_comment_id:
            # 게시글 작성자에게 알림
            notification_id = str(uuid.uuid4())[:8]
            notification_doc = {
                "notification_id": notification_id,
                "user_id": post_data.get("author_id"),
                "type": "comment",
                "post_id": post_id,
                "from_user_id": current_user.uid,
                "from_username": current_user.username,
                "message": f"{current_user.username}님이 댓글을 남겼습니다.",
                "read": False,
                "created_at": now
            }
            db.collection("notifications").document(notification_id).set(notification_doc)
            logger.info(f"📬 알림 생성: {post_data.get('author_id')}")
        else:
            # 대댓글인 경우 부모 댓글 작성자에게 알림
            parent_comment_doc = db.collection("comments").document(
                comment_data.parent_comment_id
            ).get()
            if parent_comment_doc.exists:
                parent_comment = parent_comment_doc.to_dict()
                notification_id = str(uuid.uuid4())[:8]
                notification_doc = {
                    "notification_id": notification_id,
                    "user_id": parent_comment.get("author_id"),
                    "type": "reply",
                    "post_id": post_id,
                    "comment_id": comment_id,
                    "from_user_id": current_user.uid,
                    "from_username": current_user.username,
                    "message": f"{current_user.username}님이 답글을 남겼습니다.",
                    "read": False,
                    "created_at": now
                }
                db.collection("notifications").document(notification_id).set(notification_doc)
                logger.info(f"📬 대댓글 알림 생성: {parent_comment.get('author_id')}")
        
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
# 7. 댓글 목록 조회 (Get Comments) - 계층 구조
# ============================================

@router.get(
    "/{post_id}/comments",
    response_model=CommentListResponse,
    status_code=status.HTTP_200_OK
)
async def get_comments(
    post_id: str,
    db: firestore.client = Depends(get_firestore_db)
) -> CommentListResponse:
    """
    게시글의 댓글 목록 조회 (계층 구조 포함)
    
    Args:
        post_id: 게시글 ID
        db: Firestore 클라이언트
    
    Returns:
        CommentListResponse: 댓글 목록 (부모 댓글 + 대댓글)
    
    Example:
        >>> GET /api/posts/abc123/comments
    """
    try:
        logger.info(f"💬 댓글 목록 조회: {post_id}")
        
        # 모든 댓글 조회 (부모 + 대댓글)
        comments_docs = db.collection("comments").where(
            "post_id", "==", post_id
        ).order_by("created_at", direction=firestore.Query.ASCENDING).stream()
        
        all_comments = []
        for doc in comments_docs:
            comment_data = doc.to_dict()
            all_comments.append(CommentResponse(
                comment_id=comment_data.get("comment_id"),
                post_id=comment_data.get("post_id"),
                author_id=comment_data.get("author_id"),
                author_username=comment_data.get("author_username"),
                content=comment_data.get("content"),
                likes=comment_data.get("likes", 0),
                parent_comment_id=comment_data.get("parent_comment_id"),
                created_at=comment_data.get("created_at"),
                updated_at=comment_data.get("updated_at")
            ))
        
        logger.info(f"✅ {len(all_comments)}개 댓글 조회")
        return CommentListResponse(
            comments=all_comments,
            total_count=len(all_comments)
        )
        
    except Exception as e:
        logger.error(f"❌ 댓글 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch comments"
        )


# ============================================
# 8. 댓글 수정 (Update Comment)
# ============================================

@router.put(
    "/{post_id}/comments/{comment_id}",
    response_model=CommentResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "수정 성공"},
        401: {"model": dict, "description": "권한 없음"},
        404: {"model": dict, "description": "댓글 미발견"},
    }
)
async def update_comment(
    post_id: str,
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> CommentResponse:
    """
    댓글 수정 (작성자만 가능)
    
    Args:
        post_id: 게시글 ID
        comment_id: 댓글 ID
        comment_data: 수정할 내용
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        CommentResponse: 수정된 댓글
    
    Example:
        >>> PUT /api/posts/abc123/comments/comment456
        >>> Authorization: Bearer <token>
        >>> {
        >>>   "content": "수정된 댓글 내용"
        >>> }
    """
    try:
        logger.info(f"✏️ 댓글 수정: {comment_id}")
        
        # 댓글 조회
        comment_doc = db.collection("comments").document(comment_id).get()
        
        if not comment_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = comment_doc.to_dict()
        
        # 게시글 ID 확인
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        # 작성자 확인
        if comment.get("author_id") != current_user.uid:
            logger.warning(f"⚠️ 권한 없음: {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this comment"
            )
        
        # 🔒 댓글 수정 내용 필터링
        if content_safety_service:
            check_result = content_safety_service.check_input(comment_data.content)
            if not check_result.is_safe:
                logger.warning(
                    "🚫 댓글 수정 내용에 유해 콘텐츠 감지: "
                    f"카테고리={check_result.category}, "
                    f"단어={check_result.detected_words}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "부적절한 내용이 포함된 댓글입니다.",
                        "error_code": "INAPPROPRIATE_CONTENT",
                        "category": check_result.category.value if check_result.category else None,
                        "reason": check_result.reason,
                    },
                )

        # 댓글 수정
        update_dict = {
            "content": comment_data.content,
            "updated_at": datetime.now()
        }
        
        db.collection("comments").document(comment_id).update(update_dict)
        
        logger.info(f"✅ 댓글 수정 완료: {comment_id}")
        
        # 수정된 데이터 반환
        updated_comment = comment.copy()
        updated_comment.update(update_dict)
        
        return CommentResponse(
            comment_id=updated_comment.get("comment_id"),
            post_id=updated_comment.get("post_id"),
            author_id=updated_comment.get("author_id"),
            author_username=updated_comment.get("author_username"),
            content=updated_comment.get("content"),
            likes=updated_comment.get("likes", 0),
            parent_comment_id=updated_comment.get("parent_comment_id"),
            created_at=updated_comment.get("created_at"),
            updated_at=updated_comment.get("updated_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 댓글 수정 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update comment"
        )


# ============================================
# 9. 댓글 삭제 (Delete Comment)
# ============================================

@router.delete(
    "/{post_id}/comments/{comment_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "삭제 성공"},
        401: {"model": dict, "description": "권한 없음"},
        404: {"model": dict, "description": "댓글 미발견"},
    }
)
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> MessageResponse:
    """
    댓글 삭제 (작성자만 가능, 대댓글도 함께 삭제)
    
    Args:
        post_id: 게시글 ID
        comment_id: 댓글 ID
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        MessageResponse: 삭제 메시지
    
    Example:
        >>> DELETE /api/posts/abc123/comments/comment456
        >>> Authorization: Bearer <token>
    """
    try:
        logger.info(f"🗑️ 댓글 삭제: {comment_id}")
        
        # 댓글 조회
        comment_doc = db.collection("comments").document(comment_id).get()
        
        if not comment_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = comment_doc.to_dict()
        
        # 게시글 ID 확인
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        # 작성자 확인
        if comment.get("author_id") != current_user.uid:
            logger.warning(f"⚠️ 권한 없음: {current_user.uid}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this comment"
            )
        
        # 대댓글도 함께 삭제
        replies = list(db.collection("comments").where(
            "parent_comment_id", "==", comment_id
        ).stream())
        
        reply_count = len(replies)
        for reply in replies:
            reply.reference.delete()
            logger.info(f"🗑️ 대댓글 삭제: {reply.id}")
        
        # 댓글 삭제
        db.collection("comments").document(comment_id).delete()
        
        # 게시글의 댓글 수 감소
        post_doc = db.collection("posts").document(post_id).get()
        if post_doc.exists:
            post_data = post_doc.to_dict()
            # 삭제된 댓글 + 대댓글 개수 계산
            deleted_count = 1 + reply_count
            new_count = max(0, post_data.get("comment_count", 0) - deleted_count)
            db.collection("posts").document(post_id).update({"comment_count": new_count})
        
        logger.info(f"✅ 댓글 삭제 완료: {comment_id}")
        
        return MessageResponse(message="Comment deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 댓글 삭제 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete comment"
        )


# ============================================
# 10. 댓글 좋아요 (Like Comment)
# ============================================

@router.post(
    "/{post_id}/comments/{comment_id}/like",
    response_model=CommentResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "좋아요 성공"},
        404: {"model": dict, "description": "댓글 미발견"},
    }
)
async def like_comment(
    post_id: str,
    comment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: firestore.client = Depends(get_firestore_db)
) -> CommentResponse:
    """
    댓글 좋아요 (토글)
    
    Args:
        post_id: 게시글 ID
        comment_id: 댓글 ID
        current_user: 인증된 사용자
        db: Firestore 클라이언트
    
    Returns:
        CommentResponse: 업데이트된 댓글
    
    Example:
        >>> POST /api/posts/abc123/comments/comment456/like
        >>> Authorization: Bearer <token>
    """
    try:
        logger.info(f"👍 댓글 좋아요: {comment_id}")
        
        # 댓글 조회
        comment_doc = db.collection("comments").document(comment_id).get()
        
        if not comment_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = comment_doc.to_dict()
        
        # 게시글 ID 확인
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        # 좋아요 수 증가
        new_likes = comment.get("likes", 0) + 1
        db.collection("comments").document(comment_id).update({"likes": new_likes})
        
        logger.info(f"✅ 댓글 좋아요 완료: {comment_id} (좋아요: {new_likes})")
        
        # 업데이트된 댓글 반환
        updated_comment = comment.copy()
        updated_comment["likes"] = new_likes
        
        return CommentResponse(
            comment_id=updated_comment.get("comment_id"),
            post_id=updated_comment.get("post_id"),
            author_id=updated_comment.get("author_id"),
            author_username=updated_comment.get("author_username"),
            content=updated_comment.get("content"),
            likes=new_likes,
            parent_comment_id=updated_comment.get("parent_comment_id"),
            created_at=updated_comment.get("created_at"),
            updated_at=updated_comment.get("updated_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 댓글 좋아요 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to like comment"
        )


# ============================================
# 11. 헬스 체크
# ============================================

@router.get("/health", response_model=dict)
async def posts_health():
    """Posts 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "posts",
        "timestamp": datetime.now().isoformat()
    }