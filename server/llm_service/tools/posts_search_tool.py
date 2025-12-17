"""
커뮤니티 게시글 검색 Tool
Firestore community 컬렉션에서 키워드 기반으로 게시글을 검색합니다.
"""
from langchain.tools import Tool
from typing import List
import logging

from firebase_admin import firestore

logger = logging.getLogger(__name__)


def search_posts(keyword: str) -> str:
    """
    키워드 기반 커뮤니티 게시글 검색

    Args:
        keyword: 검색 키워드 (자연어 전체 문장을 그대로 넣어도 됨)

    Returns:
        검색된 게시글 요약 문자열
    """
    try:
        db = firestore.client()
        # 최근 글 위주로 최대 50개 조회 후 파이썬에서 필터링
        query = (
            db.collection("community")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(50)
        )

        docs = list(query.stream())
        if not docs:
            return "커뮤니티에 아직 게시글이 없습니다."

        keyword_lower = keyword.lower()
        matched = []
        for doc in docs:
            data = doc.to_dict()
            title = (data.get("title") or "")
            content = (data.get("content") or "")
            combined = f"{title}\n{content}".lower()
            if keyword_lower in combined:
                matched.append(data)

        if not matched:
            return f"'{keyword}'와(과) 관련된 게시글을 찾지 못했습니다."

        lines: List[str] = [
            f"'{keyword}'와(과) 관련된 커뮤니티 게시글 {len(matched)}개를 찾았습니다:",
            "",
        ]

        for i, post in enumerate(matched[:10]):  # 최대 10개만 노출
            lines.append(
                f"[{i+1}] {post.get('title', '제목 없음')}"
                f"  (작성자: {post.get('author_username', '익명')}, "
                f"좋아요: {post.get('likes', 0)}, 댓글: {post.get('comment_count', 0)})"
            )

        if len(matched) > 10:
            lines.append("")
            lines.append(f"※ 총 {len(matched)}개 중 상위 10개만 표시했습니다.")

        return "\n".join(lines)

    except Exception as e:
        logger.error(f"❌ 커뮤니티 게시글 검색 오류: {e}", exc_info=True)
        return "커뮤니티 게시글을 검색하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."


PostsSearchTool = Tool(
    name="posts_search",
    description="커뮤니티 게시판에서 키워드와 관련된 게시글을 찾아 요약해주는 도구입니다.",
    func=search_posts,
)