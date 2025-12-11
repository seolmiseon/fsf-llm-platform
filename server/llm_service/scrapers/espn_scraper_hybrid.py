"""
하이브리드 스크래핑 시스템 (Option C)
- Football-Data API로 팀 로스터 가져오기
- ESPN에서 선수 통계 스크래핑
- 매칭 실패 시 에러 메시지 반환
"""

import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, List
import re
import time
from dotenv import load_dotenv
import os

load_dotenv()

FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
FOOTBALL_API_BASE = "https://api.football-data.org/v4"


# ==================== Football-Data API ====================
def get_team_squad(team_id: int) -> Optional[List[Dict]]:
    """
    Football-Data API로 팀 로스터 가져오기

    Args:
        team_id: 팀 ID (예: 73=토트넘, 65=맨시티)

    Returns:
        [
            {
                "id": int,
                "name": str,  # 예: "Son Heung-Min"
                "position": str,
                "dateOfBirth": str,
                "nationality": str
            },
            ...
        ]
    """
    if not FOOTBALL_API_KEY:
        print("❌ FOOTBALL_API_KEY가 .env에 없습니다!")
        return None

    url = f"{FOOTBALL_API_BASE}/teams/{team_id}"
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}

    try:
        print(f"  📋 팀 ID {team_id} 로스터 가져오는 중...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()
        squad = data.get("squad", [])

        print(f"  ✅ {len(squad)}명 선수 정보 수신")
        return squad

    except requests.exceptions.HTTPError as e:
        print(f"  ❌ HTTP {e.response.status_code}")
        return None
    except Exception as e:
        print(f"  ❌ API 호출 실패: {e}")
        return None


def get_competition_teams(competition_code: str = "PL") -> Optional[List[Dict]]:
    """
    리그의 모든 팀 가져오기

    Args:
        competition_code: PL(프리미어리그), PD(라리가), SA(세리에A) 등

    Returns:
        [
            {
                "id": int,
                "name": str,  # "Tottenham Hotspur FC"
                "tla": str,   # "TOT"
                "crest": str  # 로고 URL
            },
            ...
        ]
    """
    if not FOOTBALL_API_KEY:
        print("❌ FOOTBALL_API_KEY가 .env에 없습니다!")
        return None

    url = f"{FOOTBALL_API_BASE}/competitions/{competition_code}/teams"
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}

    try:
        print(f"  🏆 {competition_code} 리그 팀 목록 가져오는 중...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()
        teams = data.get("teams", [])

        print(f"  ✅ {len(teams)}개 팀 정보 수신")
        return teams

    except Exception as e:
        print(f"  ❌ API 호출 실패: {e}")
        return None


# ==================== ESPN 매칭 테이블 ====================
# JSON 파일에서 로드
def load_espn_id_cache() -> Dict[str, int]:
    """
    espn_player_ids.json에서 선수 ID 캐시 로드

    Returns:
        {"선수이름": ESPN_ID, ...}
    """
    cache = {}

    try:
        import json
        json_file = os.path.join(os.path.dirname(__file__), 'espn_player_ids.json')

        if not os.path.exists(json_file):
            print(f"⚠️  {json_file} 파일이 없습니다. 기본 캐시 사용.")
            return _get_default_cache()

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 모든 리그의 선수를 하나의 딕셔너리로 병합
        for league, players in data.items():
            for player in players:
                name = player.get('name')
                espn_id = player.get('espn_id')

                if name and espn_id:
                    cache[name] = espn_id

        print(f"✅ ESPN ID 캐시 로드 완료: {len(cache)}명")
        return cache

    except Exception as e:
        print(f"⚠️  JSON 로드 실패: {e}")
        return _get_default_cache()


def _get_default_cache() -> Dict[str, int]:
    """폴백용 기본 캐시"""
    return {
        # 한국 선수
        "Son Heung-Min": 149945,
        "Heung-Min Son": 149945,
        "Lee Kang-In": 274197,
        "Kang-In Lee": 274197,
        "Hwang Hee-Chan": 237224,
        "Hee-Chan Hwang": 237224,
        "Kim Min-Jae": 157688,
        "Min-Jae Kim": 157688,

        # 세계 TOP 선수
        "Erling Haaland": 253989,
        "Mohamed Salah": 173896,
        "Kylian Mbappé": 231388,
        "Harry Kane": 142200,
        "Jude Bellingham": 291281,
        "Kevin De Bruyne": 134947,
        "Vinícius Júnior": 252107,
    }


# 초기화: JSON에서 캐시 로드
ESPN_ID_CACHE = load_espn_id_cache()


def find_espn_id(player_name: str) -> Optional[int]:
    """
    선수 이름으로 ESPN ID 찾기

    1순위: 캐시에서 검색
    2순위: 이름 변형 시도 (예: "Son, Heung-Min" → "Heung-Min Son")
    3순위: None 반환

    Args:
        player_name: 선수 이름

    Returns:
        ESPN ID 또는 None
    """
    # 1. 직접 매칭
    if player_name in ESPN_ID_CACHE:
        return ESPN_ID_CACHE[player_name]

    # 2. 이름 변형 시도
    # "Son, Heung-Min" → "Heung-Min Son"
    if ',' in player_name:
        parts = player_name.split(',')
        if len(parts) == 2:
            reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
            if reversed_name in ESPN_ID_CACHE:
                return ESPN_ID_CACHE[reversed_name]

    # 3. 실패
    return None


# ==================== ESPN 스크래핑 ====================
def scrape_espn_stats(espn_id: int, player_name: str = "Unknown") -> Optional[Dict]:
    """
    ESPN ID로 선수 통계 스크래핑

    Args:
        espn_id: ESPN 선수 ID
        player_name: 선수 이름 (로깅용)

    Returns:
        {
            "goals": int,
            "assists": int,
            "matches": int,
            "team": str
        }
    """
    url_name = player_name.lower().replace(' ', '-').replace(',', '').replace("'", '')
    stats_url = f"https://www.espn.com/soccer/player/stats/_/id/{espn_id}/{url_name}"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        print(f"  📊 {player_name} (ID:{espn_id}) 통계 수집 중... ", end="")
        response = requests.get(stats_url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        stats = {
            "goals": 0,
            "assists": 0,
            "matches": 0,
            "team": "Unknown"
        }

        # 팀 이름 추출
        try:
            team_elem = soup.find('div', class_='PlayerHeader__Team')
            if team_elem:
                team_link = team_elem.find('a')
                if team_link:
                    stats["team"] = team_link.text.strip()
                else:
                    # 링크가 없으면 텍스트 직접 추출 (예: "LAFC#7Forward")
                    text = team_elem.text.strip()
                    # "LAFC#7Forward" → "LAFC" 추출
                    team_match = re.match(r'^([A-Za-z\s]+)', text)
                    if team_match:
                        stats["team"] = team_match.group(1).strip()
        except:
            pass

        # 통계 테이블 파싱
        try:
            tables = soup.find_all('table', class_='Table')

            if tables and len(tables) >= 2:
                stat_table = tables[1]
                rows = stat_table.find_all('tr')

                if len(rows) > 1:
                    first_row = rows[1]
                    cells = first_row.find_all('td')

                    # ESPN 테이블 구조: GP(0), G(1), A(2), SH(3), ...
                    if len(cells) >= 3:
                        # 경기수
                        gp_text = cells[0].text.strip()
                        gp_match = re.findall(r'\d+', gp_text)
                        if gp_match:
                            stats["matches"] = int(gp_match[0])

                        # 득점
                        goals_text = cells[1].text.strip()
                        goals_match = re.findall(r'\d+', goals_text)
                        if goals_match:
                            stats["goals"] = int(goals_match[0])

                        # 어시스트
                        assists_text = cells[2].text.strip()
                        assists_match = re.findall(r'\d+', assists_text)
                        if assists_match:
                            stats["assists"] = int(assists_match[0])

        except Exception as e:
            print(f"파싱 실패: {e}")

        print(f"✅ ({stats['team']}, {stats['matches']}경기, {stats['goals']}골, {stats['assists']}도움)")
        return stats

    except Exception as e:
        print(f"❌ 실패: {e}")
        return None


# ==================== 통합 함수: Football API + ESPN ====================
def get_team_stats_with_espn(team_id: int, limit: int = None) -> List[Dict]:
    """
    팀 로스터 + ESPN 통계 결합

    Args:
        team_id: Football-Data API 팀 ID
        limit: 상위 N명만 (None=전체)

    Returns:
        [
            {
                "name": str,
                "position": str,
                "nationality": str,
                "goals": int,
                "assists": int,
                "matches": int,
                "team": str,
                "espn_id": int,
                "has_espn_stats": bool
            },
            ...
        ]
    """
    # 1. Football API로 로스터 가져오기
    squad = get_team_squad(team_id)
    if not squad:
        return []

    results = []

    # 2. 각 선수에 대해 ESPN 통계 가져오기
    for i, player in enumerate(squad):
        if limit and i >= limit:
            break

        player_name = player.get('name', '')
        espn_id = find_espn_id(player_name)

        player_data = {
            "name": player_name,
            "position": player.get('position', 'Unknown'),
            "nationality": player.get('nationality', 'Unknown'),
            "goals": 0,
            "assists": 0,
            "matches": 0,
            "team": "",
            "espn_id": espn_id,
            "has_espn_stats": False
        }

        if espn_id:
            stats = scrape_espn_stats(espn_id, player_name)
            if stats:
                player_data.update(stats)
                player_data["has_espn_stats"] = True
        else:
            print(f"  ⚠️  {player_name}: ESPN ID 없음 (캐시에 추가 필요)")

        results.append(player_data)
        time.sleep(1)  # Rate limiting

    return results


# ==================== 테스트 ====================
def test_hybrid():
    """하이브리드 시스템 테스트"""
    print("=" * 60)
    print("🧪 하이브리드 스크래핑 테스트 (Football API + ESPN)")
    print("=" * 60)

    # 토트넘 (team_id=73) 로스터 + ESPN 통계
    print("\n🏴󠁧󠁢󠁥󠁮󠁧󠁿  Tottenham Hotspur FC (team_id=73)")
    print("-" * 60)

    results = get_team_stats_with_espn(team_id=73, limit=5)  # 상위 5명만

    print("\n" + "=" * 60)
    print(f"✅ 수집 완료: {len(results)}명")
    print("=" * 60)

    for r in results:
        if r['has_espn_stats']:
            print(f"  ✅ {r['name']} ({r['position']}): {r['goals']}골 {r['assists']}도움")
        else:
            print(f"  ⚠️  {r['name']} ({r['position']}): ESPN 통계 없음")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="하이브리드 스크래핑 시스템")
    parser.add_argument("--test", action="store_true", help="토트넘 로스터 테스트")
    parser.add_argument("--team", type=int, help="팀 ID로 로스터 가져오기")
    parser.add_argument("--league", type=str, help="리그 코드 (PL, PD, SA 등)")

    args = parser.parse_args()

    if args.test:
        test_hybrid()
    elif args.team:
        results = get_team_stats_with_espn(team_id=args.team)
        print(f"\n✅ {len(results)}명 수집 완료")
    elif args.league:
        teams = get_competition_teams(args.league)
        if teams:
            print(f"\n{args.league} 리그 팀 목록:")
            for team in teams:
                print(f"  - {team['name']} (ID: {team['id']})")
    else:
        print("=" * 60)
        print("하이브리드 스크래핑 시스템 (Football API + ESPN)")
        print("=" * 60)
        print("\n사용법:")
        print("  python3 espn_scraper_hybrid.py --test")
        print("  python3 espn_scraper_hybrid.py --team 73")
        print("  python3 espn_scraper_hybrid.py --league PL")
        print("=" * 60)
