"""
Football-Data.org API 클라이언트 (완전한 구현)

📖 공식 문서: https://www.football-data.org/documentation/quickstart
🔗 API URL: https://api.football-data.org/v4

라이센스: 대부분 무료, 10 requests/minute 제한
"""

import os
import logging
import requests
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class FootballDataClient:
    """Football-Data.org API 클라이언트"""

    # 주요 리그 ID
    COMPETITIONS = {
        "PL": 2021,  # 프리미어리그 (영국)
        "LA": 2014,  # 라리가 (스페인)
        "BL": 2002,  # 분데스리가 (독일)
        "SA": 2019,  # 세리에A (이탈리아)
        "FL1": 2015,  # 리그1 (프랑스)
        "EC": 2001,  # UEFA 챔피언스리그
        "CL": 2001,  # 챔피언스리그 (별칭)
    }

    BASE_URL = "https://api.football-data.org/v4"

    def __init__(self):
        """Football-Data API 클라이언트 초기화"""
        self.api_key = os.getenv("FOOTBALL_DATA_API_KEY") or os.getenv(
            "FOOTBALL_API_KEY"
        )
        if not self.api_key:
            raise ValueError(
                "Football-Data API 키가 필요합니다. "
                "다음 중 하나를 .env에 설정하세요:\n"
                "  - FOOTBALL_DATA_API_KEY=your-key\n"
                "  - FOOTBALL_API_KEY=your-key\n"
                "가입: https://www.football-data.org/client/register"
            )

        self.headers = {
            "X-Auth-Token": self.api_key,
            "Content-Type": "application/json",
        }

        self.session = requests.Session()
        self.session.headers.update(self.headers)

        logger.info("✅ FootballDataClient 초기화 완료")

    # ============================================
    # 1. 경기 정보 (Matches)
    # ============================================

    def get_matches(
        self, competition: str = "PL", status: str = "FINISHED", limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        경기 목록 조회

        📖 엔드포인트: GET /competitions/{competitionId}/matches

        Args:
            competition: 리그 코드 (PL, LA, BL, SA, FL1)
            status: 경기 상태 (SCHEDULED, LIVE, FINISHED, POSTPONED)
            limit: 반환 개수 (1-100)

        Returns:
            경기 정보 리스트

        Example:
            >>> client = FootballDataClient()
            >>> matches = client.get_matches("PL", "FINISHED", 10)
        """
        comp_id = self.COMPETITIONS.get(competition)
        if not comp_id:
            raise ValueError(
                f"지원하지 않는 리그: {competition}. "
                f"지원: {list(self.COMPETITIONS.keys())}"
            )

        url = f"{self.BASE_URL}/competitions/{comp_id}/matches"
        params = {"status": status, "limit": min(limit, 100)}  # 최대 100개

        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            matches = data.get("matches", [])

            logger.info(
                f"✅ {len(matches)}개 경기 조회 성공 " f"({competition}, {status})"
            )

            return matches

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 경기 조회 실패: {e}")
            return []

    def get_match_details(self, match_id: int) -> Optional[Dict[str, Any]]:
        """
        특정 경기 상세 정보 조회

        📖 엔드포인트: GET /matches/{matchId}

        Args:
            match_id: 경기 ID

        Returns:
            경기 상세 정보

        Example:
            >>> details = client.get_match_details(401828)
        """
        url = f"{self.BASE_URL}/matches/{match_id}"

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            match = response.json()
            logger.info(f"✅ 경기 상세 조회 성공 (ID: {match_id})")

            return match

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 경기 상세 조회 실패 (ID: {match_id}): {e}")
            return None

    def get_live_matches(self) -> List[Dict[str, Any]]:
        """
        진행 중인 경기 조회

        📖 엔드포인트: GET /matches?status=LIVE

        Returns:
            진행 중인 경기 리스트
        """
        url = f"{self.BASE_URL}/matches"
        params = {"status": "LIVE", "limit": 100}

        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            matches = data.get("matches", [])

            logger.info(f"✅ {len(matches)}개 라이브 경기 조회")

            return matches

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 라이브 경기 조회 실패: {e}")
            return []

    # ============================================
    # 2. 순위표 (Standings)
    # ============================================

    def get_standings(self, competition: str = "PL") -> Optional[Dict[str, Any]]:
        """
        순위표 조회

        📖 엔드포인트: GET /competitions/{competitionId}/standings

        Args:
            competition: 리그 코드

        Returns:
            순위표 데이터

        Example:
            >>> standings = client.get_standings("PL")
            >>> for table in standings["standings"]:
            ...     for team in table["table"]:
            ...         print(f"{team['position']}. {team['team']['name']}")
        """
        comp_id = self.COMPETITIONS.get(competition)
        if not comp_id:
            raise ValueError(f"지원하지 않는 리그: {competition}")

        url = f"{self.BASE_URL}/competitions/{comp_id}/standings"

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            logger.info(f"✅ {competition} 순위표 조회 성공")

            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 순위표 조회 실패 ({competition}): {e}")
            return None

    # ============================================
    # 3. 팀 정보 (Teams)
    # ============================================

    def get_team_info(self, team_id: int) -> Optional[Dict[str, Any]]:
        """
        팀 상세 정보 조회

        📖 엔드포인트: GET /teams/{teamId}

        Args:
            team_id: 팀 ID

        Returns:
            팀 정보 (이름, 로고, 설립일 등)

        Example:
            >>> arsenal = client.get_team_info(57)
            >>> print(arsenal["name"])  # "Arsenal FC"
        """
        url = f"{self.BASE_URL}/teams/{team_id}"

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            team = response.json()
            logger.info(f"✅ 팀 정보 조회 성공 (ID: {team_id})")

            return team

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 팀 정보 조회 실패 (ID: {team_id}): {e}")
            return None

    def get_team_squad(self, team_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        팀 선수단 조회

        📖 엔드포인트: GET /teams/{teamId}
        (squad 정보 포함)

        Args:
            team_id: 팀 ID

        Returns:
            선수 리스트 (이름, 번호, 포지션 등)

        Example:
            >>> arsenal_squad = client.get_team_squad(57)
            >>> for player in arsenal_squad:
            ...     print(f"{player['name']} ({player.get('position', 'N/A')})")
        """
        team_info = self.get_team_info(team_id)

        if team_info:
            squad = team_info.get("squad", [])
            logger.info(f"✅ 팀 선수단 조회 성공: {len(squad)}명")
            return squad

    def get_teams_by_competition(self, competition: str = "PL") -> List[Dict[str, Any]]:
        """
        특정 리그의 모든 팀 조회

        📖 엔드포인트: GET /competitions/{competitionId}/standings

        주의: Football-Data API는 /competitions/{id} 엔드포인트에서
        teams 배열을 반환하지 않습니다.
        대신 standings에서 팀 정보를 추출합니다.

        Args:
            competition: 리그 코드 (PL, LA, BL, SA, FL1)

        Returns:
            팀 리스트 (standings에서 추출)

        Example:
            >>> teams = client.get_teams_by_competition("PL")
            >>> for team in teams:
            ...     print(team["name"])
        """
        comp_id = self.COMPETITIONS.get(competition)
        if not comp_id:
            raise ValueError(f"지원하지 않는 리그: {competition}")

        url = f"{self.BASE_URL}/competitions/{comp_id}/standings"

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            standings = data.get("standings", [])

            # standings에서 팀 정보 추출
            teams = []
            if standings and len(standings) > 0:
                # 첫 번째 테이블 (일반적으로 리그 순위)
                table = standings[0].get("table", [])

                # 각 순위 항목에서 팀 정보 추출
                for entry in table:
                    team_data = entry.get("team", {})

                    # 팀 데이터 정제
                    team = {
                        "id": team_data.get("id"),
                        "name": team_data.get("name"),
                        "shortName": team_data.get("shortName", ""),
                        "tla": team_data.get("tla", ""),  # Three Letter Abbreviation
                        "crest": team_data.get("crest", ""),  # 로고 URL
                        "website": team_data.get("website", ""),
                        "founded": team_data.get("founded", ""),
                        "venue": team_data.get("venue", ""),
                        "position": entry.get("position"),  # 순위
                        "points": entry.get("points"),  # 포인트
                        "played_games": entry.get("playedGames"),  # 경기 수
                        "wins": entry.get("won"),
                        "draws": entry.get("draw"),
                        "losses": entry.get("lost"),
                        "goals_for": entry.get("goalsFor"),
                        "goals_against": entry.get("goalsAgainst"),
                        "goal_difference": entry.get("goalDifference"),
                    }

                    teams.append(team)

            logger.info(
                f"✅ {competition} {len(teams)}개 팀 조회 성공 " f"(순위표에서 추출)"
            )

            return teams

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 팀 조회 실패 ({competition}): {e}")
            return []

    # ============================================
    # 4. 유틸리티
    # ============================================

    def parse_match_data(self, match: Dict[str, Any]) -> Dict[str, Any]:
        """경기 데이터 정제"""
        try:
            return {
                "match_id": match.get("id"),
                "home_team": match.get("homeTeam", {}).get("name"),
                "away_team": match.get("awayTeam", {}).get("name"),
                "home_team_id": match.get("homeTeam", {}).get("id"),
                "away_team_id": match.get("awayTeam", {}).get("id"),
                "score": {
                    "home": match.get("score", {}).get("fullTime", {}).get("home"),
                    "away": match.get("score", {}).get("fullTime", {}).get("away"),
                },
                "status": match.get("status"),
                "date": match.get("utcDate"),
                "competition": match.get("competition", {}).get("name"),
            }
        except Exception as e:
            logger.error(f"❌ 경기 데이터 파싱 실패: {e}")
            return {}

    def get_api_status(self) -> Dict[str, Any]:
        """API 상태 확인"""
        try:
            response = self.session.get(f"{self.BASE_URL}/competitions", timeout=10)

            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "code": 200,
                    "message": "Football-Data API 정상",
                }
            else:
                return {
                    "status": "error",
                    "code": response.status_code,
                    "message": "Football-Data API 오류",
                }

        except Exception as e:
            logger.error(f"❌ API 상태 확인 실패: {e}")
            return {"status": "error", "code": 0, "message": str(e)}

    def close(self):
        """세션 종료"""
        self.session.close()
        logger.info("✅ FootballDataClient 세션 종료")
