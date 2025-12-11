"""
ESPN ID 대량 수집기
- 리그별 득점 순위 페이지에서 선수 ID 추출
- JSON 파일로 저장 → 캐시로 활용
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import time
from typing import Dict, List


# ==================== ESPN 리그 코드 ====================
LEAGUE_CODES = {
    "프리미어리그": "eng.1",
    "라리가": "esp.1",
    "분데스리가": "ger.1",
    "세리에A": "ita.1",
    "리그1": "fra.1",
    "MLS": "usa.1",
    "챔피언스리그": "uefa.champions",
}


# ==================== ESPN 득점 순위 스크래핑 ====================
def scrape_league_top_scorers(league_code: str, limit: int = 100) -> List[Dict]:
    """
    리그별 득점 순위 페이지에서 선수 정보 추출

    Args:
        league_code: ESPN 리그 코드 (예: "eng.1")
        limit: 가져올 선수 수 (기본 100명)

    Returns:
        [
            {
                "name": str,
                "espn_id": int,
                "team": str,
                "goals": int,
                "assists": int,
                "league": str
            },
            ...
        ]
    """
    url = f"https://www.espn.com/soccer/stats/_/league/{league_code}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        print(f"  🌐 {league_code} 리그 통계 페이지 접근 중...")
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        players = []

        # ESPN 통계 테이블 찾기
        # 선수 링크 패턴: /soccer/player/_/id/{ID}/{name}
        player_links = soup.find_all('a', href=re.compile(r'/soccer/player/_/id/\d+/'))

        seen_ids = set()

        for link in player_links:
            if len(players) >= limit:
                break

            href = link.get('href')
            match = re.search(r'/id/(\d+)/', href)

            if match:
                espn_id = int(match.group(1))

                # 중복 제거
                if espn_id in seen_ids:
                    continue
                seen_ids.add(espn_id)

                player_name = link.text.strip()

                # 빈 이름 제외
                if not player_name or len(player_name) < 2:
                    continue

                # 기본 정보
                player_data = {
                    "name": player_name,
                    "espn_id": espn_id,
                    "team": "",
                    "goals": 0,
                    "assists": 0,
                    "league": league_code
                }

                # 같은 행에서 팀, 득점, 어시스트 추출 시도
                parent_row = link.find_parent('tr')
                if parent_row:
                    cells = parent_row.find_all('td')
                    if len(cells) >= 3:
                        # 일반적인 ESPN 테이블 구조
                        # 0: 이름, 1: 팀, 2: 경기수, 3: 득점, 4: 어시스트
                        try:
                            if len(cells) > 1:
                                team_elem = cells[1]
                                player_data["team"] = team_elem.text.strip()

                            if len(cells) > 3:
                                goals_text = cells[3].text.strip()
                                goals_match = re.findall(r'\d+', goals_text)
                                if goals_match:
                                    player_data["goals"] = int(goals_match[0])

                            if len(cells) > 4:
                                assists_text = cells[4].text.strip()
                                assists_match = re.findall(r'\d+', assists_text)
                                if assists_match:
                                    player_data["assists"] = int(assists_match[0])
                        except:
                            pass

                players.append(player_data)
                print(f"    ✅ {player_name} (ID: {espn_id}, {player_data['team']})")

        print(f"  ✅ {len(players)}명 수집 완료")
        return players

    except Exception as e:
        print(f"  ❌ 스크래핑 실패: {e}")
        return []


# ==================== 전체 리그 수집 ====================
def collect_all_leagues(limit_per_league: int = 100) -> Dict[str, List[Dict]]:
    """
    모든 주요 리그에서 선수 ID 수집

    Returns:
        {
            "프리미어리그": [...],
            "라리가": [...],
            ...
        }
    """
    print("=" * 60)
    print("🔍 ESPN ID 대량 수집 시작")
    print("=" * 60)

    all_data = {}

    for league_name, league_code in LEAGUE_CODES.items():
        print(f"\n📊 {league_name} ({league_code})")
        print("-" * 60)

        players = scrape_league_top_scorers(league_code, limit=limit_per_league)
        all_data[league_name] = players

        time.sleep(2)  # Rate limiting

    return all_data


# ==================== JSON 저장 ====================
def save_to_json(data: Dict, filename: str = "espn_player_ids.json"):
    """
    수집한 데이터를 JSON 파일로 저장

    Args:
        data: 리그별 선수 데이터
        filename: 저장할 파일명
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 통계 출력
        total_players = sum(len(players) for players in data.values())
        print("\n" + "=" * 60)
        print(f"💾 JSON 저장 완료: {filename}")
        print("=" * 60)
        print(f"총 {total_players}명 수집")
        for league, players in data.items():
            print(f"  - {league}: {len(players)}명")
        print("=" * 60)

    except Exception as e:
        print(f"❌ JSON 저장 실패: {e}")


def load_from_json(filename: str = "espn_player_ids.json") -> Dict:
    """
    저장된 JSON 파일 로드

    Returns:
        리그별 선수 데이터
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  {filename} 파일이 없습니다.")
        return {}
    except Exception as e:
        print(f"❌ JSON 로드 실패: {e}")
        return {}


# ==================== ID 검색 함수 ====================
def search_player_id(player_name: str, data: Dict) -> int:
    """
    저장된 데이터에서 선수 ID 검색

    Args:
        player_name: 선수 이름
        data: load_from_json()으로 로드한 데이터

    Returns:
        ESPN ID 또는 None
    """
    for league, players in data.items():
        for player in players:
            if player['name'].lower() == player_name.lower():
                return player['espn_id']

            # 부분 매칭 시도 (예: "Maddison" → "James Maddison")
            if player_name.lower() in player['name'].lower():
                return player['espn_id']

    return None


# ==================== 테스트 ====================
def test_single_league():
    """단일 리그 테스트"""
    print("🧪 프리미어리그 득점 순위 테스트\n")

    players = scrape_league_top_scorers("eng.1", limit=20)

    if players:
        print(f"\n✅ 수집 성공: {len(players)}명")
        print("\n상위 10명:")
        for i, p in enumerate(players[:10], 1):
            print(f"  {i}. {p['name']} (ID: {p['espn_id']}, {p['team']}, {p['goals']}골)")
    else:
        print("\n❌ 수집 실패")


def test_full_collection():
    """전체 리그 수집 + JSON 저장"""
    data = collect_all_leagues(limit_per_league=100)
    save_to_json(data, "espn_player_ids.json")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ESPN ID 대량 수집기")
    parser.add_argument("--test", action="store_true", help="프리미어리그 테스트 (20명)")
    parser.add_argument("--collect", action="store_true", help="전체 리그 수집 (각 50명)")
    parser.add_argument("--search", type=str, help="선수 이름 검색")

    args = parser.parse_args()

    if args.test:
        test_single_league()
    elif args.collect:
        test_full_collection()
    elif args.search:
        data = load_from_json()
        if data:
            espn_id = search_player_id(args.search, data)
            if espn_id:
                print(f"✅ {args.search} → ESPN ID: {espn_id}")
            else:
                print(f"❌ '{args.search}' 검색 결과 없음")
        else:
            print("먼저 --collect로 데이터 수집 필요")
    else:
        print("=" * 60)
        print("ESPN ID 대량 수집기")
        print("=" * 60)
        print("\n사용법:")
        print("  python3 espn_id_collector.py --test")
        print("  python3 espn_id_collector.py --collect")
        print("  python3 espn_id_collector.py --search 'James Maddison'")
        print("\n💡 --test로 먼저 테스트 후 --collect 권장!")
        print("=" * 60)
