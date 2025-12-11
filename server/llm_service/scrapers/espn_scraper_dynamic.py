"""
동적 ESPN 스크래핑 시스템
- 하드코딩 제거
- 선수 이름으로 자동 검색
- URL 자동 추출
"""

import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict
import re
import time
from urllib.parse import quote


# ==================== 동적 ESPN 검색 ====================
def search_espn_player(player_name: str, max_retries: int = 3) -> Optional[Dict]:
    """
    ESPN에서 선수 검색 → URL 자동 추출

    전략:
    1. Google 검색: "site:espn.com/soccer/player {player_name}"
    2. 직접 URL 패턴 매칭으로 선수 이름 → URL 변환

    Args:
        player_name: 선수 이름 (영문, 예: "Son Heung-Min", "Erling Haaland")
        max_retries: 최대 재시도 횟수

    Returns:
        {
            "name": str,
            "espn_id": int,
            "url": str,
            "team": str (optional)
        }
        or None if not found
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # 전략 1: ESPN 선수 이름을 URL 형식으로 변환
    # "Son Heung-Min" → "son-heung-min"
    url_name = player_name.lower().replace(' ', '-').replace("'", '')

    # ESPN URL 패턴 추측: https://www.espn.com/soccer/player/_/id/{ID}/{url_name}
    # ID는 모르지만, 선수 프로필 페이지는 리다이렉트됨
    # 전략: ESPN에 선수 이름으로 직접 접근 시도

    for attempt in range(max_retries):
        try:
            print(f"  🔍 '{player_name}' 검색 중... (시도 {attempt + 1}/{max_retries})")

            # Google Custom Search API 대신 ESPN 내부 검색 사용
            # ESPN 선수 검색 API (비공식)
            search_api_url = f"https://site.web.api.espn.com/apis/search/v2?query={quote(player_name)}&type=players&limit=10&sport=soccer"

            response = requests.get(search_api_url, headers=headers, timeout=15)
            response.raise_for_status()

            data = response.json()

            # 검색 결과 파싱
            if 'results' in data and len(data['results']) > 0:
                first_result = data['results'][0]

                # ESPN ID 추출
                if 'id' in first_result:
                    espn_id = int(first_result['id'])
                    player_url_name = first_result.get('slug', url_name)

                    # Stats URL 생성
                    stats_url = f"https://www.espn.com/soccer/player/stats/_/id/{espn_id}/{player_url_name}"

                    print(f"  ✅ 발견: ID={espn_id}")

                    return {
                        "name": player_name,
                        "espn_id": espn_id,
                        "url": stats_url,
                        "profile_url": f"https://www.espn.com/soccer/player/_/id/{espn_id}/{player_url_name}"
                    }

            # 검색 결과 없음
            print(f"  ⚠️  '{player_name}' 검색 결과 없음")
            return None

        except requests.exceptions.Timeout:
            print(f"  ⏱️  타임아웃 (시도 {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(2)
            continue

        except requests.exceptions.HTTPError as e:
            print(f"  ❌ HTTP {e.response.status_code}")
            return None

        except Exception as e:
            print(f"  ❌ 검색 실패: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            continue

    print(f"  ❌ '{player_name}' 검색 최종 실패 (재시도 {max_retries}회)")
    return None


# ==================== ESPN 통계 스크래핑 (URL 직접 사용) ====================
def scrape_espn_stats_from_url(stats_url: str, player_name: str = "Unknown") -> Optional[Dict]:
    """
    ESPN 통계 페이지에서 데이터 스크래핑

    Args:
        stats_url: ESPN 통계 페이지 URL
        player_name: 선수 이름 (로깅용)

    Returns:
        {
            "goals": int,
            "assists": int,
            "matches": int,
            "team": str
        }
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        print(f"  📊 {player_name} 통계 수집 중... ", end="")
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

    except requests.exceptions.Timeout:
        print(f"❌ 타임아웃")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP {e.response.status_code}")
        return None
    except Exception as e:
        print(f"❌ 스크래핑 실패: {e}")
        return None


# ==================== 통합 함수: 검색 + 스크래핑 ====================
def get_player_stats_dynamic(player_name: str) -> Optional[Dict]:
    """
    선수 이름으로 ESPN 검색 → 통계 스크래핑 (원스톱)

    Args:
        player_name: 선수 이름 (영문)

    Returns:
        {
            "name": str,
            "espn_id": int,
            "team": str,
            "goals": int,
            "assists": int,
            "matches": int,
            "url": str
        }
    """
    # 1. ESPN에서 선수 검색
    search_result = search_espn_player(player_name)

    if not search_result:
        return None

    # 2. 통계 스크래핑
    stats = scrape_espn_stats_from_url(search_result["url"], player_name)

    if not stats:
        return None

    # 3. 결과 병합
    return {
        "name": player_name,
        "espn_id": search_result["espn_id"],
        "team": stats["team"],
        "goals": stats["goals"],
        "assists": stats["assists"],
        "matches": stats["matches"],
        "url": search_result["url"]
    }


# ==================== 테스트 ====================
def test_search():
    """동적 검색 테스트"""
    print("=" * 60)
    print("🧪 ESPN 동적 검색 테스트")
    print("=" * 60)

    test_players = [
        "Son Heung-Min",
        "Erling Haaland",
        "Mohamed Salah",
        "Lee Kang-In"
    ]

    results = []

    for player in test_players:
        print(f"\n🔍 {player}")
        print("-" * 60)

        result = get_player_stats_dynamic(player)

        if result:
            results.append(result)
            print(f"✅ 성공!")
            print(f"   ID: {result['espn_id']}")
            print(f"   팀: {result['team']}")
            print(f"   득점: {result['goals']}골")
            print(f"   어시스트: {result['assists']}개")
            print(f"   출전: {result['matches']}경기")
        else:
            print(f"❌ 실패")

        time.sleep(2)  # Rate limiting

    # 결과 요약
    print("\n" + "=" * 60)
    print(f"✨ 테스트 완료: {len(results)}/{len(test_players)} 성공")
    print("=" * 60)

    for r in results:
        print(f"  - {r['name']}: {r['goals']}골 {r['assists']}도움")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ESPN 동적 스크래핑")
    parser.add_argument("--test", action="store_true", help="테스트 실행 (4명 선수)")
    parser.add_argument("--search", type=str, help="특정 선수 검색 (예: 'Son Heung-Min')")

    args = parser.parse_args()

    if args.test:
        test_search()
    elif args.search:
        print(f"🔍 '{args.search}' 검색 중...\n")
        result = get_player_stats_dynamic(args.search)
        if result:
            print("\n✅ 결과:")
            print(f"  이름: {result['name']}")
            print(f"  ESPN ID: {result['espn_id']}")
            print(f"  팀: {result['team']}")
            print(f"  득점: {result['goals']}골")
            print(f"  어시스트: {result['assists']}개")
            print(f"  출전: {result['matches']}경기")
            print(f"  URL: {result['url']}")
        else:
            print("\n❌ 검색 실패")
    else:
        print("=" * 60)
        print("ESPN 동적 스크래핑 시스템")
        print("=" * 60)
        print("\n사용법:")
        print("  python espn_scraper_dynamic.py --test")
        print("  python espn_scraper_dynamic.py --search 'Son Heung-Min'")
        print("\n💡 --test로 먼저 테스트 권장!")
        print("=" * 60)
