"""
경기 일정 Tool
날짜 기반으로 경기 일정을 조회하고, 팀 필터링, 사용자 선호도 기반 필터링, 주간/월간 요약 기능을 제공합니다.
"""
from langchain.tools import Tool
from typing import Optional, List, Dict, Set
import logging
from datetime import datetime, timedelta
import re

from ..external_apis.football_data import FootballDataClient
from firebase_admin import firestore

logger = logging.getLogger(__name__)

# FootballDataClient 인스턴스 (싱글톤)
_football_client: Optional[FootballDataClient] = None


def get_football_client() -> FootballDataClient:
    """FootballDataClient 싱글톤 인스턴스 반환"""
    global _football_client
    if _football_client is None:
        _football_client = FootballDataClient()
    return _football_client


def parse_date(date_str: str) -> Optional[str]:
    """
    날짜 문자열을 파싱하여 YYYY-MM-DD 형식으로 반환
    
    Args:
        date_str: 날짜 문자열 (예: "오늘", "내일", "2025-12-25", "12월 25일")
    
    Returns:
        YYYY-MM-DD 형식의 날짜 문자열 또는 None
    """
    try:
        date_str = date_str.strip().lower()
        today = datetime.now()
        
        # "오늘" 처리
        if date_str in ["오늘", "today"]:
            return today.strftime("%Y-%m-%d")
        
        # "내일" 처리
        if date_str in ["내일", "tomorrow"]:
            tomorrow = today + timedelta(days=1)
            return tomorrow.strftime("%Y-%m-%d")
        
        # "어제" 처리
        if date_str in ["어제", "yesterday"]:
            yesterday = today - timedelta(days=1)
            return yesterday.strftime("%Y-%m-%d")
        
        # 이미 YYYY-MM-DD 형식인 경우
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
        
        # "12월 25일" 형식 처리
        month_day_match = re.search(r'(\d{1,2})월\s*(\d{1,2})일', date_str)
        if month_day_match:
            month = int(month_day_match.group(1))
            day = int(month_day_match.group(2))
            # 올해로 가정 (다음 해인 경우는 고려하지 않음)
            year = today.year
            try:
                parsed_date = datetime(year, month, day)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                return None
        
        # "12/25" 형식 처리
        slash_match = re.search(r'(\d{1,2})/(\d{1,2})', date_str)
        if slash_match:
            month = int(slash_match.group(1))
            day = int(slash_match.group(2))
            year = today.year
            try:
                parsed_date = datetime(year, month, day)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                return None
        
        return None
        
    except Exception as e:
        logger.error(f"❌ 날짜 파싱 오류: {e}")
        return None


def get_user_favorite_teams(user_id: Optional[str] = None) -> List[str]:
    """
    사용자가 좋아하는 팀 목록을 조회합니다.
    
    Args:
        user_id: 사용자 ID (선택적)
    
    Returns:
        팀 ID 리스트
    """
    if not user_id:
        return []
    
    try:
        db = firestore.client()
        favorites_ref = db.collection("favorites")
        query = favorites_ref.where("userId", "==", user_id)
        docs = list(query.stream())
        
        favorite_teams = []
        for doc in docs:
            data = doc.to_dict()
            team_id = data.get("playerId")  # 실제로는 teamId
            if team_id:
                favorite_teams.append(team_id)
        
        return list(set(favorite_teams))
    except Exception as e:
        logger.error(f"❌ 사용자 선호도 조회 오류: {e}")
        return []


def filter_matches_by_team(matches: List[Dict], team_name: str) -> List[Dict]:
    """
    경기 목록에서 특정 팀이 포함된 경기만 필터링합니다.
    
    Args:
        matches: 경기 목록
        team_name: 팀 이름 (부분 일치 가능)
    
    Returns:
        필터링된 경기 목록
    """
    team_name_lower = team_name.lower()
    filtered = []
    
    for match in matches:
        home_team = match.get("homeTeam", {}).get("name", "").lower()
        away_team = match.get("awayTeam", {}).get("name", "").lower()
        
        if team_name_lower in home_team or team_name_lower in away_team:
            filtered.append(match)
    
    return filtered


def filter_matches_by_favorite_teams(matches: List[Dict], favorite_team_ids: List[str]) -> List[Dict]:
    """
    경기 목록에서 사용자가 좋아하는 팀의 경기만 필터링합니다.
    
    Args:
        matches: 경기 목록
        favorite_team_ids: 사용자가 좋아하는 팀 ID 리스트
    
    Returns:
        필터링된 경기 목록
    """
    if not favorite_team_ids:
        return matches
    
    filtered = []
    for match in matches:
        home_team_id = str(match.get("homeTeam", {}).get("id", ""))
        away_team_id = str(match.get("awayTeam", {}).get("id", ""))
        
        if home_team_id in favorite_team_ids or away_team_id in favorite_team_ids:
            filtered.append(match)
    
    return filtered


def get_matches_by_date(date_str: str, competition: str = "PL", team_filter: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """
    특정 날짜의 경기 일정을 조회합니다.
    
    Args:
        date_str: 날짜 문자열 (예: "오늘", "내일", "2025-12-25", "12월 25일")
        competition: 리그 코드 (기본값: "PL" - 프리미어리그)
        team_filter: 특정 팀 이름으로 필터링 (선택적, 예: "토트넘")
        user_id: 사용자 ID (선택적, 사용자 선호 팀 경기만 표시)
    
    Returns:
        경기 일정 정보 문자열
    """
    try:
        # 날짜 파싱
        parsed_date = parse_date(date_str)
        if not parsed_date:
            return f"날짜를 파싱할 수 없습니다: '{date_str}'. '오늘', '내일', '2025-12-25', '12월 25일' 형식을 사용해주세요."
        
        # Football-Data API에서 경기 조회
        football_client = get_football_client()
        matches = football_client.get_matches(
            competition=competition,
            status="SCHEDULED",  # 예정된 경기만 조회
            limit=100
        )
        
        if not matches:
            return f"{parsed_date}에 예정된 {competition} 리그 경기가 없습니다."
        
        # 해당 날짜의 경기만 필터링
        target_matches = []
        for match in matches:
            match_date = match.get("utcDate", "")
            if match_date.startswith(parsed_date):
                target_matches.append(match)
        
        if not target_matches:
            return f"{parsed_date}에 예정된 {competition} 리그 경기가 없습니다."
        
        # 사용자 선호 팀 필터링
        if user_id:
            favorite_team_ids = get_user_favorite_teams(user_id)
            if favorite_team_ids:
                target_matches = filter_matches_by_favorite_teams(target_matches, favorite_team_ids)
                if not target_matches:
                    return f"{parsed_date}에 예정된 사용자가 좋아하는 팀의 경기가 없습니다."
        
        # 특정 팀 필터링
        if team_filter:
            target_matches = filter_matches_by_team(target_matches, team_filter)
            if not target_matches:
                return f"{parsed_date}에 '{team_filter}' 팀의 경기가 없습니다."
        
        # 결과 포맷팅
        filter_info = ""
        if user_id:
            filter_info = " (사용자 선호 팀)"
        if team_filter:
            filter_info = f" ({team_filter} 팀)"
        
        result = f"{parsed_date} {competition} 리그 경기 일정{filter_info} ({len(target_matches)}경기):\n\n"
        
        for i, match in enumerate(target_matches[:20], 1):  # 최대 20경기만 표시
            home_team = match.get("homeTeam", {}).get("name", "알 수 없음")
            away_team = match.get("awayTeam", {}).get("name", "알 수 없음")
            utc_date = match.get("utcDate", "")
            
            # 시간 포맷팅 (UTC → KST 변환은 생략, 원본 표시)
            try:
                dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
                time_str = dt.strftime("%Y-%m-%d %H:%M")
            except:
                time_str = utc_date
            
            result += f"[{i}] {home_team} vs {away_team}\n"
            result += f"    시간: {time_str}\n"
            result += f"    경기 ID: {match.get('id', 'N/A')}\n\n"
        
        if len(target_matches) > 20:
            result += f"※ 총 {len(target_matches)}경기 중 상위 20경기만 표시했습니다.\n"
        
        logger.info(f"✅ 경기 일정 조회 완료: {parsed_date} ({len(target_matches)}경기)")
        return result
        
    except Exception as e:
        logger.error(f"❌ 경기 일정 조회 오류: {e}", exc_info=True)
        return f"경기 일정 조회 중 오류가 발생했습니다: {str(e)}"


def get_weekly_summary(competition: str = "PL", user_id: Optional[str] = None) -> str:
    """
    이번 주 경기 일정 요약을 조회합니다.
    
    Args:
        competition: 리그 코드 (기본값: "PL")
        user_id: 사용자 ID (선택적, 사용자 선호 팀 경기만 표시)
    
    Returns:
        주간 경기 일정 요약 문자열
    """
    try:
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        football_client = get_football_client()
        matches = football_client.get_matches(
            competition=competition,
            status="SCHEDULED",
            limit=100
        )
        
        if not matches:
            return f"이번 주({week_start.strftime('%Y-%m-%d')} ~ {week_end.strftime('%Y-%m-%d')})에 예정된 {competition} 리그 경기가 없습니다."
        
        # 이번 주 경기만 필터링
        week_matches = []
        for match in matches:
            match_date = match.get("utcDate", "")
            try:
                match_dt = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
                if week_start.date() <= match_dt.date() <= week_end.date():
                    week_matches.append(match)
            except:
                continue
        
        # 사용자 선호 팀 필터링
        if user_id:
            favorite_team_ids = get_user_favorite_teams(user_id)
            if favorite_team_ids:
                week_matches = filter_matches_by_favorite_teams(week_matches, favorite_team_ids)
        
        if not week_matches:
            return f"이번 주에 예정된 경기가 없습니다."
        
        # 날짜별로 그룹화
        matches_by_date: Dict[str, List[Dict]] = {}
        for match in week_matches:
            match_date = match.get("utcDate", "")
            try:
                match_dt = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
                date_key = match_dt.strftime("%Y-%m-%d")
                if date_key not in matches_by_date:
                    matches_by_date[date_key] = []
                matches_by_date[date_key].append(match)
            except:
                continue
        
        # 결과 포맷팅
        result = f"이번 주({week_start.strftime('%Y-%m-%d')} ~ {week_end.strftime('%Y-%m-%d')}) {competition} 리그 경기 일정 ({len(week_matches)}경기):\n\n"
        
        for date_key in sorted(matches_by_date.keys()):
            date_matches = matches_by_date[date_key]
            result += f"📅 {date_key} ({len(date_matches)}경기):\n"
            
            for i, match in enumerate(date_matches[:10], 1):  # 날짜별 최대 10경기
                home_team = match.get("homeTeam", {}).get("name", "알 수 없음")
                away_team = match.get("awayTeam", {}).get("name", "알 수 없음")
                utc_date = match.get("utcDate", "")
                
                try:
                    dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
                    time_str = dt.strftime("%H:%M")
                except:
                    time_str = utc_date
                
                result += f"  [{i}] {home_team} vs {away_team} ({time_str})\n"
            
            if len(date_matches) > 10:
                result += f"  ※ 총 {len(date_matches)}경기 중 상위 10경기만 표시\n"
            result += "\n"
        
        logger.info(f"✅ 주간 경기 일정 조회 완료: {len(week_matches)}경기")
        return result
        
    except Exception as e:
        logger.error(f"❌ 주간 경기 일정 조회 오류: {e}", exc_info=True)
        return f"주간 경기 일정 조회 중 오류가 발생했습니다: {str(e)}"


def get_monthly_summary(competition: str = "PL", user_id: Optional[str] = None) -> str:
    """
    이번 달 경기 일정 요약을 조회합니다.
    
    Args:
        competition: 리그 코드 (기본값: "PL")
        user_id: 사용자 ID (선택적, 사용자 선호 팀 경기만 표시)
    
    Returns:
        월간 경기 일정 요약 문자열
    """
    try:
        today = datetime.now()
        month_start = today.replace(day=1)
        if today.month == 12:
            month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        football_client = get_football_client()
        matches = football_client.get_matches(
            competition=competition,
            status="SCHEDULED",
            limit=200
        )
        
        if not matches:
            return f"이번 달({month_start.strftime('%Y-%m-%d')} ~ {month_end.strftime('%Y-%m-%d')})에 예정된 {competition} 리그 경기가 없습니다."
        
        # 이번 달 경기만 필터링
        month_matches = []
        for match in matches:
            match_date = match.get("utcDate", "")
            try:
                match_dt = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
                if month_start.date() <= match_dt.date() <= month_end.date():
                    month_matches.append(match)
            except:
                continue
        
        # 사용자 선호 팀 필터링
        if user_id:
            favorite_team_ids = get_user_favorite_teams(user_id)
            if favorite_team_ids:
                month_matches = filter_matches_by_favorite_teams(month_matches, favorite_team_ids)
        
        if not month_matches:
            return f"이번 달에 예정된 경기가 없습니다."
        
        # 날짜별로 그룹화
        matches_by_date: Dict[str, List[Dict]] = {}
        for match in month_matches:
            match_date = match.get("utcDate", "")
            try:
                match_dt = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
                date_key = match_dt.strftime("%Y-%m-%d")
                if date_key not in matches_by_date:
                    matches_by_date[date_key] = []
                matches_by_date[date_key].append(match)
            except:
                continue
        
        # 결과 포맷팅
        result = f"이번 달({month_start.strftime('%Y-%m')}) {competition} 리그 경기 일정 ({len(month_matches)}경기):\n\n"
        
        for date_key in sorted(matches_by_date.keys()):
            date_matches = matches_by_date[date_key]
            result += f"📅 {date_key} ({len(date_matches)}경기):\n"
            
            for i, match in enumerate(date_matches[:5], 1):  # 날짜별 최대 5경기
                home_team = match.get("homeTeam", {}).get("name", "알 수 없음")
                away_team = match.get("awayTeam", {}).get("name", "알 수 없음")
                utc_date = match.get("utcDate", "")
                
                try:
                    dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
                    time_str = dt.strftime("%H:%M")
                except:
                    time_str = utc_date
                
                result += f"  [{i}] {home_team} vs {away_team} ({time_str})\n"
            
            if len(date_matches) > 5:
                result += f"  ※ 총 {len(date_matches)}경기 중 상위 5경기만 표시\n"
            result += "\n"
        
        logger.info(f"✅ 월간 경기 일정 조회 완료: {len(month_matches)}경기")
        return result
        
    except Exception as e:
        logger.error(f"❌ 월간 경기 일정 조회 오류: {e}", exc_info=True)
        return f"월간 경기 일정 조회 중 오류가 발생했습니다: {str(e)}"


def calendar_query(query: str, user_id: Optional[str] = None) -> str:
    """
    자연어 쿼리를 파싱하여 적절한 경기 일정 조회 함수를 호출합니다.
    
    Args:
        query: 자연어 쿼리 (예: "오늘 경기", "이번 주 경기", "토트넘 경기", "내가 좋아하는 팀 경기")
        user_id: 사용자 ID (선택적)
    
    Returns:
        경기 일정 정보 문자열
    """
    query_lower = query.lower()
    
    # 주간 요약
    if "이번 주" in query_lower or "주간" in query_lower or "week" in query_lower:
        # 리그 추출 시도
        competition = "PL"
        if "프리미어" in query_lower or "pl" in query_lower:
            competition = "PL"
        elif "라리가" in query_lower or "la" in query_lower:
            competition = "LA"
        elif "분데스리가" in query_lower or "bl" in query_lower:
            competition = "BL"
        return get_weekly_summary(competition, user_id)
    
    # 월간 요약
    if "이번 달" in query_lower or "월간" in query_lower or "month" in query_lower:
        competition = "PL"
        if "프리미어" in query_lower or "pl" in query_lower:
            competition = "PL"
        elif "라리가" in query_lower or "la" in query_lower:
            competition = "LA"
        elif "분데스리가" in query_lower or "bl" in query_lower:
            competition = "BL"
        return get_monthly_summary(competition, user_id)
    
    # 특정 팀 필터링
    team_filter = None
    common_teams = ["토트넘", "맨유", "맨시티", "리버풀", "첼시", "아스날", "바르셀로나", "레알마드리드", "바이에른", "도르트문트"]
    for team in common_teams:
        if team in query_lower:
            team_filter = team
            break
    
    # 사용자 선호 팀 필터링
    use_favorite = False
    if "내가 좋아하는" in query_lower or "내 팀" in query_lower or "선호" in query_lower:
        use_favorite = True
    
    # 날짜 파싱
    date_str = query
    for keyword in ["경기", "일정", "스케줄"]:
        date_str = date_str.replace(keyword, "").strip()
    
    # 리그 추출
    competition = "PL"
    if "프리미어" in query_lower or "pl" in query_lower:
        competition = "PL"
    elif "라리가" in query_lower or "la" in query_lower:
        competition = "LA"
    elif "분데스리가" in query_lower or "bl" in query_lower:
        competition = "BL"
    
    return get_matches_by_date(
        date_str,
        competition,
        team_filter=team_filter if not use_favorite else None,
        user_id=user_id if use_favorite else None
    )


# LangChain Tool로 변환
# description만으로 LLM이 자동으로 판단하도록 간결하게 작성
CalendarTool = Tool(
    name="calendar",
    description="경기 일정을 조회하는 도구입니다. 날짜(오늘, 내일, 특정 날짜), 팀 이름, 리그, 주간/월간 요약 등 경기 일정과 관련된 모든 질문에 사용합니다.",
    func=lambda query: calendar_query(query.strip())
)

