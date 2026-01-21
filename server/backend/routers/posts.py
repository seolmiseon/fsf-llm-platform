"""
Backend Posts 라우터 - 게시글 CRUD 및 댓글

Supabase (PostgreSQL)를 사용한 게시글 관리 시스템

📖 Supabase: https://supabase.com/docs
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from supabase import Client
import uuid

from ..models import (
    PostCreate, PostUpdate, PostResponse, PostListResponse,
    CommentCreate, CommentUpdate, CommentResponse, CommentListResponse,
    UserResponse, MessageResponse
)
from ..dependencies import get_current_user, get_supabase_db, get_optional_user

# 콘텐츠 필터링 서비스
try:
    from llm_service.services.content_safety_service import ContentSafetyService
    content_safety_service = ContentSafetyService()
    logging.getLogger(__name__).info("✅ ContentSafetyService 초기화 완료")
except Exception as e:
    content_safety_service = None
    logging.getLogger(__name__).warning(f"⚠️ ContentSafetyService 초기화 실패: {e}")

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Posts"])


# ============================================
# 1. 게시글 생성 (Create Post)
# ============================================

@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_post(
    post_data: PostCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> PostResponse:
    """새 게시글 작성"""
    try:
        logger.info(f"📝 게시글 생성: {current_user.username}")
        
        # 콘텐츠 필터링
        if content_safety_service:
            try:
                text_to_check = f"{post_data.title}\n{post_data.content}"
                check_result = content_safety_service.check_input(text_to_check)
                if not check_result.is_safe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "error": "부적절한 내용이 포함된 게시글입니다.",
                            "error_code": "INAPPROPRIATE_CONTENT",
                            "category": check_result.category.value if check_result.category else None,
                            "reason": check_result.reason,
                        },
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"⚠️ 콘텐츠 필터링 실패: {e}")
        
        # 카테고리 자동 분류
        final_category = post_data.category or "general"
        if content_safety_service and final_category == "general":
            try:
                auto_category = content_safety_service.classify_category(
                    post_data.title, post_data.content
                )
                if auto_category and auto_category != "general":
                    final_category = auto_category
            except:
                pass
        
        # 게시글 ID 생성
        post_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        
        # Supabase에 저장
        post_doc = {
            "post_id": post_id,
            "author_id": current_user.uid,
            "author_username": current_user.username,
            "title": post_data.title,
            "content": post_data.content,
            "category": final_category,
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "created_at": now,
            "updated_at": None
        }
        
        result = db.table("posts").insert(post_doc).execute()
        
        if not result.data:
            raise Exception("Failed to insert post")
        
        # 유저의 post_count 증가
        db.rpc("increment_post_count", {"user_uid": current_user.uid}).execute()
        
        logger.info(f"✅ 게시글 생성 완료: {post_id}")
        
        return PostResponse(
            post_id=post_id,
            author_id=current_user.uid,
            author_username=current_user.username,
            title=post_data.title,
            content=post_data.content,
            category=final_category,
            views=0,
            likes=0,
            comment_count=0,
            created_at=now
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 게시글 생성 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"게시글 생성 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 2. 게시글 목록 조회 (Get Posts)
# ============================================

@router.get(
    "",
    response_model=PostListResponse,
    status_code=status.HTTP_200_OK
)
async def get_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    db: Client = Depends(get_supabase_db),
    current_user: Optional[UserResponse] = Depends(get_optional_user)
) -> PostListResponse:
    """게시글 목록 조회 (페이징)"""
    try:
        logger.info(f"📖 게시글 목록 조회: page={page}, size={page_size}")
        
        # 기본 쿼리
        query = db.table("posts").select("*", count="exact")
        
        # 삭제되지 않은 게시글만
        query = query.eq("is_deleted", False)
        
        # 카테고리 필터
        if category:
            query = query.eq("category", category)
        
        # 정렬 및 페이징
        offset = (page - 1) * page_size
        result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
        
        total_count = result.count if result.count else 0
        
        # PostResponse 리스트 생성
        posts = []
        for data in result.data:
            posts.append(PostResponse(
                post_id=data.get("post_id"),
                author_id=data.get("author_id"),
                author_username=data.get("author_username"),
                title=data.get("title"),
                content=data.get("content"),
                category=data.get("category"),
                views=data.get("views", 0),
                likes=data.get("likes", 0),
                comment_count=data.get("comment_count", 0),
                created_at=data.get("created_at"),
                updated_at=data.get("updated_at")
            ))
        
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
    status_code=status.HTTP_200_OK
)
async def get_post(
    post_id: str,
    db: Client = Depends(get_supabase_db)
) -> PostResponse:
    """게시글 상세 조회 (조회수 증가)"""
    try:
        logger.info(f"📖 게시글 조회: {post_id}")
        
        result = db.table("posts").select("*").eq("post_id", post_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post_data = result.data[0]
        
        # 조회수 증가
        new_views = post_data.get("views", 0) + 1
        db.table("posts").update({"views": new_views}).eq("post_id", post_id).execute()
        
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
    status_code=status.HTTP_200_OK
)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> PostResponse:
    """게시글 수정 (작성자만 가능)"""
    try:
        logger.info(f"✏️ 게시글 수정: {post_id}")
        
        # 게시글 조회
        result = db.table("posts").select("*").eq("post_id", post_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post = result.data[0]
        
        # 작성자 확인
        if post.get("author_id") != current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this post"
            )
        
        # 콘텐츠 필터링
        new_title = post_data.title if post_data.title else post.get("title")
        new_content = post_data.content if post_data.content else post.get("content")
        
        if content_safety_service and (post_data.title or post_data.content):
            try:
                text_to_check = f"{new_title}\n{new_content}"
                check_result = content_safety_service.check_input(text_to_check)
                if not check_result.is_safe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "error": "부적절한 내용이 포함된 게시글입니다.",
                            "error_code": "INAPPROPRIATE_CONTENT",
                        },
                    )
            except HTTPException:
                raise
            except:
                pass
        
        # 수정 데이터 준비
        update_dict = {}
        if post_data.title:
            update_dict["title"] = post_data.title
        if post_data.content:
            update_dict["content"] = post_data.content
        if post_data.category:
            update_dict["category"] = post_data.category
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_dict["updated_at"] = datetime.now().isoformat()
        
        # Supabase 업데이트
        db.table("posts").update(update_dict).eq("post_id", post_id).execute()
        
        logger.info(f"✅ 게시글 수정 완료: {post_id}")
        
        # 수정된 데이터 반환
        updated_post = {**post, **update_dict}
        
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
    status_code=status.HTTP_200_OK
)
async def delete_post(
    post_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> MessageResponse:
    """게시글 삭제 (작성자만 가능)"""
    try:
        logger.info(f"🗑️ 게시글 삭제: {post_id}")
        
        result = db.table("posts").select("*").eq("post_id", post_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post = result.data[0]
        
        # 작성자 확인
        if post.get("author_id") != current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this post"
            )
        
        # 소프트 삭제
        db.table("posts").update({"is_deleted": True}).eq("post_id", post_id).execute()
        
        # 관련 댓글도 소프트 삭제
        db.table("comments").update({"is_deleted": True}).eq("post_id", post_id).execute()
        
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
    db: Client = Depends(get_supabase_db)
) -> CommentResponse:
    """게시글에 댓글 추가"""
    try:
        logger.info(f"💬 댓글 추가: {post_id}")
        
        # 콘텐츠 필터링
        if content_safety_service:
            try:
                check_result = content_safety_service.check_input(comment_data.content)
                if not check_result.is_safe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "error": "부적절한 내용이 포함된 댓글입니다.",
                            "error_code": "INAPPROPRIATE_CONTENT",
                        },
                    )
            except HTTPException:
                raise
            except:
                pass
        
        # 게시글 존재 확인
        post_result = db.table("posts").select("*").eq("post_id", post_id).execute()
        if not post_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # 댓글 ID 생성
        comment_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        
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
        db.table("comments").insert(comment_doc).execute()
        
        # 게시글의 댓글 수 증가
        post_data = post_result.data[0]
        new_count = post_data.get("comment_count", 0) + 1
        db.table("posts").update({"comment_count": new_count}).eq("post_id", post_id).execute()
        
        # 유저의 comment_count 증가
        db.rpc("increment_comment_count", {"user_uid": current_user.uid}).execute()
        
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
    response_model=CommentListResponse,
    status_code=status.HTTP_200_OK
)
async def get_comments(
    post_id: str,
    db: Client = Depends(get_supabase_db)
) -> CommentListResponse:
    """게시글의 댓글 목록 조회"""
    try:
        logger.info(f"💬 댓글 목록 조회: {post_id}")
        
        result = db.table("comments").select("*").eq("post_id", post_id).eq("is_deleted", False).order("created_at").execute()
        
        all_comments = []
        for data in result.data:
            all_comments.append(CommentResponse(
                comment_id=data.get("comment_id"),
                post_id=data.get("post_id"),
                author_id=data.get("author_id"),
                author_username=data.get("author_username"),
                content=data.get("content"),
                likes=data.get("likes", 0),
                parent_comment_id=data.get("parent_comment_id"),
                created_at=data.get("created_at"),
                updated_at=data.get("updated_at")
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
    status_code=status.HTTP_200_OK
)
async def update_comment(
    post_id: str,
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> CommentResponse:
    """댓글 수정 (작성자만 가능)"""
    try:
        logger.info(f"✏️ 댓글 수정: {comment_id}")
        
        result = db.table("comments").select("*").eq("comment_id", comment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = result.data[0]
        
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        if comment.get("author_id") != current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this comment"
            )
        
        # 콘텐츠 필터링
        if content_safety_service:
            try:
                check_result = content_safety_service.check_input(comment_data.content)
                if not check_result.is_safe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={"error": "부적절한 내용이 포함된 댓글입니다."},
                    )
            except HTTPException:
                raise
            except:
                pass
        
        update_dict = {
            "content": comment_data.content,
            "updated_at": datetime.now().isoformat()
        }
        
        db.table("comments").update(update_dict).eq("comment_id", comment_id).execute()
        
        logger.info(f"✅ 댓글 수정 완료: {comment_id}")
        
        updated_comment = {**comment, **update_dict}
        
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
    status_code=status.HTTP_200_OK
)
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> MessageResponse:
    """댓글 삭제 (작성자만 가능)"""
    try:
        logger.info(f"🗑️ 댓글 삭제: {comment_id}")
        
        result = db.table("comments").select("*").eq("comment_id", comment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = result.data[0]
        
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        if comment.get("author_id") != current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this comment"
            )
        
        # 대댓글 소프트 삭제
        db.table("comments").update({"is_deleted": True}).eq("parent_comment_id", comment_id).execute()
        
        # 댓글 소프트 삭제
        db.table("comments").update({"is_deleted": True}).eq("comment_id", comment_id).execute()
        
        # 게시글의 댓글 수 감소
        post_result = db.table("posts").select("comment_count").eq("post_id", post_id).execute()
        if post_result.data:
            new_count = max(0, post_result.data[0].get("comment_count", 1) - 1)
            db.table("posts").update({"comment_count": new_count}).eq("post_id", post_id).execute()
        
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
    status_code=status.HTTP_200_OK
)
async def like_comment(
    post_id: str,
    comment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Client = Depends(get_supabase_db)
) -> CommentResponse:
    """댓글 좋아요"""
    try:
        logger.info(f"👍 댓글 좋아요: {comment_id}")
        
        result = db.table("comments").select("*").eq("comment_id", comment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        comment = result.data[0]
        
        if comment.get("post_id") != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment does not belong to this post"
            )
        
        new_likes = comment.get("likes", 0) + 1
        db.table("comments").update({"likes": new_likes}).eq("comment_id", comment_id).execute()
        
        logger.info(f"✅ 댓글 좋아요 완료: {comment_id}")
        
        return CommentResponse(
            comment_id=comment.get("comment_id"),
            post_id=comment.get("post_id"),
            author_id=comment.get("author_id"),
            author_username=comment.get("author_username"),
            content=comment.get("content"),
            likes=new_likes,
            parent_comment_id=comment.get("parent_comment_id"),
            created_at=comment.get("created_at"),
            updated_at=comment.get("updated_at")
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
        "database": "supabase",
        "timestamp": datetime.now().isoformat()
    }
