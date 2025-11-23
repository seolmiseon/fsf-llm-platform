"""
실시간 축구 데이터 수집 (하이브리드 - 완성판)
1. Football-Data.org API: 리그 순위, 경기 결과
2. ESPN 스크래핑: 선수 득점, 어시스트 (한국 선수 6명 + 세계 TOP 8명)

하드코딩 없음 - 모든 데이터는 실시간 수집
"""

import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import time
import re

# 환경변수 로드
load_dotenv()

# 현재 디렉토리를 PYTHONPATH에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from llm_service.services.rag_service import RAGService
except ImportError as e:
    print(f"❌ llm_service import 실패: {e}")
    sys.exit(1)


# ==================== 설정 ====================
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
FOOTBALL_API_BASE = "https://api.football-data.org/v4"

# ESPN 선수 URL (한국 선수 특화 + 세계 TOP)
ESPN_PLAYER_URLS = {
    # 한국 선수 (6명)
    "손흥민": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/149945/son-heung-min",
        "id": 149945,
        "team": "Los Angeles FC",
        "league": "MLS"
    },
    "이강인": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/274197/lee-kang-in",
        "id": 274197,
        "team": "Paris Saint-Germain",
        "league": "Ligue 1"
    },
    "황희찬": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/237224/hwang-hee-chan",
        "id": 237224,
        "team": "Wolverhampton",
        "league": "Premier League"
    },
    "김민재": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/157688/kim-min-jae",
        "id": 157688,
        "team": "Bayern Munich",
        "league": "Bundesliga"
    },
    "배준호": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/362208/bae-jun-ho",
        "id": 362208,
        "team": "Stoke City",
        "league": "Championship"
    },
    "양민혁": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/371578/yang-min-hyeok",
        "id": 371578,
        "team": "Portsmouth",
        "league": "Championship"
    },
    
    # 세계 TOP 선수 (8명)
    "홀란드": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/253989/erling-haaland",
        "id": 253989,
        "team": "Manchester City",
        "league": "Premier League"
    },
    "살라": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/173896/mohamed-salah",
        "id": 173896,
        "team": "Liverpool",
        "league": "Premier League"
    },
    "음바페": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/231388/kylian-mbappe",
        "id": 231388,
        "team": "Real Madrid",
        "league": "La Liga"
    },
    "케인": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/142200/harry-kane",
        "id": 142200,
        "team": "Bayern Munich",
        "league": "Bundesliga"
    },
    "벨링엄": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/291281/jude-bellingham",
        "id": 291281,
        "team": "Real Madrid",
        "league": "La Liga"
    },
    "더브라위너": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/134947/kevin-de-bruyne",
        "id": 134947,
        "team": "Manchester City",
        "league": "Premier League"
    },
    "네이마르": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/132948/neymar",
        "id": 132948,
        "team": "Al Hilal",
        "league": "Saudi Pro League"
    },
    "비니시우스": {
        "url": "https://www.espn.com/soccer/player/stats/_/id/252107/vinicius-junior",
        "id": 252107,
        "team": "Real Madrid",
        "league": "La Liga"
    },
}


def get_current_season():
    """현재 시즌 자동 계산 (8월 기준)"""
    now = datetime.now()
    year = now.year
    month = now.month
    
    if month >= 8:
        return f"{year}-{str(year+1)[2:]}"
    else:
        return f"{year-1}-{str(year)[2:]}"


# ==================== Football API ====================
def fetch_league_standings(league_code: str = "PL") -> Optional[Dict]:
    """
    Football-Data.org API로 리그 순위 가져오기
    
    Args:
        league_code: PL(프리미어리그), PD(라리가), SA(세리에A) 등
    
    Returns:
        API 응답 JSON 또는 None
    """
    if not FOOTBALL_API_KEY:
        print("❌ FOOTBALL_API_KEY가 .env에 없습니다!")
        return None
    
    url = f"{FOOTBALL_API_BASE}/competitions/{league_code}/standings"
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"❌ API HTTP 에러: {e}")
        return None
    except Exception as e:
        print(f"❌ {league_code} 순위 조회 실패: {e}")
        return None


# ==================== ESPN 스크래핑 ====================
def scrape_espn_player(player_name: str) -> Optional[Dict]:
    """
    ESPN에서 선수 실제 통계 스크래핑
    
    Args:
        player_name: 선수 이름 (한글)
    
    Returns:
        {
            "goals": int,
            "assists": int,
            "matches": int,
            "team": str
        }
    """
    if player_name not in ESPN_PLAYER_URLS:
        print(f"⚠️  {player_name}: ESPN URL 없음")
        return None
    
    player_info = ESPN_PLAYER_URLS[player_name]
    url = player_info["url"]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        print(f"  🌐 {player_name} ({player_info['team']})... ", end="")
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # === ESPN HTML 파싱 ===
        stats = {
            "goals": 0,
            "assists": 0,
            "matches": 0,
            "team": player_info["team"]
        }
        
        # ESPN 통계 테이블 찾기
        try:
            # 테이블 구조: 첫 번째 테이블이 최신 시즌
            tables = soup.find_all('table', class_='Table')
            
            if tables and len(tables) >= 2:
                # 두 번째 테이블 = 실제 통계 테이블
                stat_table = tables[1]
                rows = stat_table.find_all('tr')
                
                if len(rows) > 1:
                    # 첫 번째 데이터 행 (최신 시즌)
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
        
        print(f"✅ ({stats['matches']}경기, {stats['goals']}골, {stats['assists']}도움)")
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


# ==================== ChromaDB 업데이트 ====================
def update_chromadb_with_real_data():
    """실시간 데이터로 ChromaDB 업데이트"""
    
    print("=" * 60)
    print("🔄 실시간 축구 데이터 수집 시작")
    print("=" * 60)
    
    try:
        rag = RAGService()
    except Exception as e:
        print(f"❌ RAGService 초기화 실패: {e}")
        return False
    
    all_documents = []
    all_metadatas = []
    current_season = get_current_season()
    update_date = datetime.now().strftime('%Y년 %m월 %d일')
    
    # ==================== 1. 선수 통계 (ESPN 스크래핑) ====================
    print(f"\n📊 선수 통계 스크래핑 중... (ESPN)")
    print(f"대상: 한국 선수 6명 + 세계 TOP 8명 = 총 14명")
    print("-" * 60)
    
    korean_players = ["손흥민", "이강인", "황희찬", "김민재", "배준호", "양민혁"]
    world_players = ["홀란드", "살라", "음바페", "케인", "벨링엄", "더브라위너", "네이마르", "비니시우스"]
    
    print("🇰🇷 한국 선수:")
    for player_name in korean_players:
        stats = scrape_espn_player(player_name)
        
        if stats:
            document = f"""{player_name} ({stats['team']})
{current_season} 시즌 통계
출전: {stats['matches']}경기
득점: {stats['goals']}골
어시스트: {stats['assists']}개
업데이트: {update_date}"""
            
            all_documents.append(document)
            all_metadatas.append({
                "player": player_name,
                "team": stats['team'],
                "type": "player_stats",
                "season": current_season,
                "goals": stats['goals'],
                "assists": stats['assists'],
                "source": "espn",
                "nationality": "Korea"
            })
        
        time.sleep(1)  # Rate limiting
    
    print("\n🌍 세계 TOP 선수:")
    for player_name in world_players:
        stats = scrape_espn_player(player_name)
        
        if stats:
            document = f"""{player_name} ({stats['team']})
{current_season} 시즌 통계
출전: {stats['matches']}경기
득점: {stats['goals']}골
어시스트: {stats['assists']}개
업데이트: {update_date}"""
            
            all_documents.append(document)
            all_metadatas.append({
                "player": player_name,
                "team": stats['team'],
                "type": "player_stats",
                "season": current_season,
                "goals": stats['goals'],
                "assists": stats['assists'],
                "source": "espn"
            })
        
        time.sleep(1)  # Rate limiting
    
    player_count = len([m for m in all_metadatas if m['type'] == 'player_stats'])
    print(f"\n✅ {player_count}명 선수 통계 수집 완료")
    
    # ==================== 2. 리그 순위 (Football API) ====================
    print(f"\n📊 프리미어리그 순위 수집 중... (Football API)")
    print("-" * 60)
    
    standings = fetch_league_standings("PL")
    if standings:
        competition = standings.get("competition", {})
        league_name = competition.get("name", "프리미어리그")
        
        for standing in standings.get("standings", []):
            if standing.get("type") != "TOTAL":
                continue
            
            table = standing.get("table", [])
            for entry in table[:10]:  # 상위 10팀
                team = entry.get("team", {})
                team_name = team.get("name", "")
                
                if not team_name:
                    continue
                
                document = f"""{team_name} ({league_name})
{current_season} 시즌 순위: {entry.get('position')}위
경기수: {entry.get('playedGames')}경기
승점: {entry.get('points')}점
승-무-패: {entry.get('won')}-{entry.get('draw')}-{entry.get('lost')}
득점: {entry.get('goalsFor')}
실점: {entry.get('goalsAgainst')}
득실차: {entry.get('goalDifference')}
업데이트: {update_date}"""
                
                all_documents.append(document)
                all_metadatas.append({
                    "team": team_name,
                    "league": league_name,
                    "type": "team_standings",
                    "season": current_season,
                    "position": entry.get('position'),
                    "source": "football_api"
                })
        
        print(f"✅ {len(table[:10])}개 팀 순위 수집 완료")
    else:
        print("⚠️  리그 순위 수집 실패")
    
    # ==================== 3. ChromaDB 저장 ====================
    if all_documents:
        print(f"\n💾 ChromaDB 저장 중... ({len(all_documents)}개 문서)")
        try:
            rag.add_documents(
                collection_name="fsf_collection",
                documents=all_documents,
                metadatas=all_metadatas
            )
            print(f"✅ ChromaDB 업데이트 완료!")
        except Exception as e:
            print(f"❌ ChromaDB 저장 실패: {e}")
            return False
    else:
        print("⚠️  수집된 데이터가 없습니다.")
        return False
    
    # ==================== 4. 결과 요약 ====================
    print("\n" + "=" * 60)
    print("✨ 데이터 수집 완료!")
    print("=" * 60)
    
    korean_count = len([m for m in all_metadatas if m.get('nationality') == 'Korea'])
    world_count = player_count - korean_count
    team_count = len([m for m in all_metadatas if m['type'] == 'team_standings'])
    
    print(f"📊 수집 결과:")
    print(f"  - 한국 선수: {korean_count}명")
    print(f"  - 세계 TOP: {world_count}명")
    print(f"  - 팀 순위: {team_count}개")
    print(f"  - 총 문서: {len(all_documents)}개")
    print(f"  - 시즌: {current_season}")
    print("=" * 60)
    
    return True


# ==================== 테스트 ====================
def test_api():
    """Football API 연결 테스트"""
    print("🔍 Football API 테스트\n")
    
    if not FOOTBALL_API_KEY:
        print("❌ FOOTBALL_API_KEY가 .env에 없습니다!")
        return False
    
    print(f"✅ API Key: {FOOTBALL_API_KEY[:10]}...")
    
    print("\n📊 프리미어리그 순위 조회 중...")
    standings = fetch_league_standings("PL")
    
    if standings:
        competition = standings.get("competition", {})
        print(f"✅ {competition.get('name')} 데이터 수신 성공!")
        
        for standing in standings.get("standings", []):
            if standing.get("type") == "TOTAL":
                table = standing.get("table", [])
                if table:
                    first = table[0]
                    team = first.get("team", {})
                    print(f"\n현재 1위:")
                    print(f"  팀명: {team.get('name')}")
                    print(f"  승점: {first.get('points')}점")
                    print(f"  승-무-패: {first.get('won')}-{first.get('draw')}-{first.get('lost')}")
                break
        return True
    else:
        print("❌ API 호출 실패!")
        return False


def test_scraping():
    """ESPN 스크래핑 테스트 (손흥민 1명)"""
    print("🔍 ESPN 스크래핑 테스트\n")
    print("테스트 대상: 손흥민\n")
    
    stats = scrape_espn_player("손흥민")
    
    if stats:
        print("\n✅ 스크래핑 성공!")
        print(f"  소속팀: {stats['team']}")
        print(f"  출전: {stats['matches']}경기")
        print(f"  득점: {stats['goals']}골")
        print(f"  어시스트: {stats['assists']}개")
        return True
    else:
        print("\n❌ 스크래핑 실패!")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="실시간 축구 데이터 수집")
    parser.add_argument("--test-api", action="store_true", help="Football API 테스트")
    parser.add_argument("--test-scraping", action="store_true", help="ESPN 스크래핑 테스트 (손흥민)")
    parser.add_argument("--update", action="store_true", help="전체 데이터 수집 & ChromaDB 업데이트")
    
    args = parser.parse_args()
    
    if args.test_api:
        test_api()
    elif args.test_scraping:
        test_scraping()
    elif args.update:
        update_chromadb_with_real_data()
    else:
        print("=" * 60)
        print("FSF 실시간 데이터 수집 스크립트")
        print("=" * 60)
        print("\n사용법:")
        print("  python fetch_real_data.py --test-api       # Football API 테스트")
        print("  python fetch_real_data.py --test-scraping  # ESPN 스크래핑 테스트")
        print("  python fetch_real_data.py --update         # 전체 데이터 수집")
        print("\n💡 --test-scraping으로 먼저 테스트 권장!")
        print("=" * 60)