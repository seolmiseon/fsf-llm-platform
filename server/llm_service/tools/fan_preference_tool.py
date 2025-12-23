"""
사용자 선호도 Tool
Firestore favorites 컬렉션에서 사용자가 좋아하는 팀/선수 정보를 조회합니다.
"""
from langchain.tools import Tool
from typing import Optional
import logging

from firebase_admin import firestore

logger = logging.getLogger(__name__)


def get_user_favorites(user_id: str) -> str:
    """
    사용자가 좋아하는 팀/선수 목록을 조회합니다.
    
    Args:
        user_id: 사용자 ID (Firebase UID)
    
    Returns:
        사용자 선호도 정보 문자열
    """
    try:
        if not user_id:
            return "사용자 ID가 제공되지 않았습니다. 로그인 후 사용해주세요."
        
        db = firestore.client()
        
        # favorites 컬렉션에서 해당 사용자의 즐겨찾기 조회
        favorites_ref = db.collection("favorites")
        query = favorites_ref.where("userId", "==", user_id).order_by("createdAt", direction=firestore.Query.DESCENDING)
        
        docs = list(query.stream())
        
        if not docs:
            return f"사용자 {user_id}의 즐겨찾기가 없습니다. fanpicker 페이지에서 팀을 선택해주세요."
        
        # 즐겨찾기 정보 수집
        favorite_teams = []
        for doc in docs:
            data = doc.to_dict()
            player_id = data.get("playerId")  # 실제로는 teamId
            favorite_teams.append(player_id)
        
        # 중복 제거
        unique_teams = list(set(favorite_teams))
        
        if not unique_teams:
            return f"사용자 {user_id}의 즐겨찾기가 없습니다."
        
        # 결과 포맷팅
        result = f"사용자가 좋아하는 팀/선수 목록 ({len(unique_teams)}개):\n"
        result += "\n".join([f"- {team_id}" for team_id in unique_teams])
        result += f"\n\n이 정보를 활용하여 개인화된 답변을 제공할 수 있습니다."
        
        logger.info(f"✅ 사용자 선호도 조회 완료: {user_id} ({len(unique_teams)}개 팀)")
        return result
        
    except Exception as e:
        logger.error(f"❌ 사용자 선호도 조회 오류: {e}", exc_info=True)
        return f"사용자 선호도 조회 중 오류가 발생했습니다: {str(e)}"


def create_fan_preference_tool(user_id: str) -> Tool:
    """
    FanPreferenceTool을 동적으로 생성합니다.
    
    Args:
        user_id: 사용자 ID (필수)
    
    Returns:
        LangChain Tool 인스턴스
    """
    def fan_preference_wrapper(query: str) -> str:
        """
        사용자 선호도 조회 래퍼 함수
        
        Args:
            query: 사용자 질문 (무시됨, user_id 사용)
        
        Returns:
            사용자 선호도 정보
        """
        # 클로저로 user_id 사용
        return get_user_favorites(user_id)
    
    return Tool(
        name="fan_preference",
        description="사용자가 좋아하는 팀/선수 목록을 조회하는 도구입니다. 사용자의 개인 선호도, 즐겨찾기, 관심 팀/선수와 관련된 질문에 사용합니다. 이 도구는 현재 로그인한 사용자의 선호도를 자동으로 조회합니다.",
        func=fan_preference_wrapper
    )


# 기본 Tool (user_id 없이 사용할 때)
FanPreferenceTool = Tool(
    name="fan_preference",
    description="사용자가 좋아하는 팀/선수 목록을 조회하는 도구입니다. 사용자의 개인 선호도, 즐겨찾기, 관심 팀/선수와 관련된 질문에 사용합니다.",
    func=lambda query: get_user_favorites(query.strip())
)

