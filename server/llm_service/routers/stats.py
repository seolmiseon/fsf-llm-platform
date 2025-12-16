"""
Stats API Router
- 리그별 득점/어시스트 순위
- 팀 순위표
- 선수 개인 통계
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
from datetime import datetime
import sys
import os
import json

# espn_scraper_hybrid 임포트
try:
    from llm_service.scrapers.espn_scraper_hybrid import (
        get_competition_teams,
        get_team_squad,
        find_espn_id,
        scrape_espn_stats,
        load_espn_id_cache
    )
except ImportError as e:
    print(f"⚠️  espn_scraper_hybrid import 실패: {e}")
    get_competition_teams = None
    get_team_squad = None


router = APIRouter(
    prefix="/stats",
    tags=["stats"]
)


# ==================== JSON 캐시에서 통계 가져오기 ====================
def get_top_scorers_from_cache(league: str = "프리미어리그", limit: int = 20) -> List[Dict]:
    """
    JSON 캐시에서 득점 순위 가져오기

    Args:
        league: 리그 이름 (프리미어리그, 라리가, 분데스리가 등)
        limit: 상위 N명

    Returns:
        [{"name": str, "team": str, "goals": int, "assists": int, ...}, ...]
    """
    try:
        json_file = os.path.join(os.path.dirname(__file__), '../data/espn_player_ids.json')

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if league not in data:
            return []

        players = data[league]

        # 득점순 정렬
        sorted_players = sorted(players, key=lambda x: x.get('goals', 0), reverse=True)

        return sorted_players[:limit]

    except Exception as e:
        print(f"❌ JSON 로드 실패: {e}")
        return []


def get_top_assists_from_cache(league: str = "프리미어리그", limit: int = 20) -> List[Dict]:
    """
    JSON 캐시에서 어시스트 순위 가져오기
    """
    try:
        json_file = os.path.join(os.path.dirname(__file__), '../data/espn_player_ids.json')

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if league not in data:
            return []

        players = data[league]

        # 어시스트순 정렬
        sorted_players = sorted(players, key=lambda x: x.get('assists', 0), reverse=True)

        return sorted_players[:limit]

    except Exception as e:
        print(f"❌ JSON 로드 실패: {e}")
        return []


# ==================== API 엔드포인트 ====================

@router.get("/top-scorers", summary="득점 순위")
async def get_top_scorers(
    league: str = Query("프리미어리그", description="리그 이름"),
    limit: int = Query(20, ge=1, le=100, description="상위 N명")
):
    """
    리그별 득점 순위 TOP N

    - **league**: 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, MLS, 챔피언스리그
    - **limit**: 상위 몇 명 (1-100)

    Returns:
        {
            "success": true,
            "league": "프리미어리그",
            "count": 20,
            "data": [
                {
                    "rank": 1,
                    "name": "Erling Haaland",
                    "team": "Manchester City",
                    "goals": 15,
                    "assists": 3,
                    "espn_id": 253989
                },
                ...
            ]
        }
    """
    players = get_top_scorers_from_cache(league, limit)

    if not players:
        raise HTTPException(
            status_code=404,
            detail=f"'{league}' 리그 데이터를 찾을 수 없습니다."
        )

    # 순위 추가
    result = []
    for i, player in enumerate(players, 1):
        result.append({
            "rank": i,
            "name": player.get('name'),
            "team": player.get('team', 'Unknown'),
            "goals": player.get('goals', 0),
            "assists": player.get('assists', 0),
            "espn_id": player.get('espn_id')
        })

    return {
        "success": True,
        "league": league,
        "count": len(result),
        "data": result,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/top-assists", summary="어시스트 순위")
async def get_top_assists(
    league: str = Query("프리미어리그", description="리그 이름"),
    limit: int = Query(20, ge=1, le=100, description="상위 N명")
):
    """
    리그별 어시스트 순위 TOP N
    """
    players = get_top_assists_from_cache(league, limit)

    if not players:
        raise HTTPException(
            status_code=404,
            detail=f"'{league}' 리그 데이터를 찾을 수 없습니다."
        )

    # 순위 추가
    result = []
    for i, player in enumerate(players, 1):
        result.append({
            "rank": i,
            "name": player.get('name'),
            "team": player.get('team', 'Unknown'),
            "goals": player.get('goals', 0),
            "assists": player.get('assists', 0),
            "espn_id": player.get('espn_id')
        })

    return {
        "success": True,
        "league": league,
        "count": len(result),
        "data": result,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/leagues", summary="사용 가능한 리그 목록")
async def get_available_leagues():
    """
    데이터가 있는 리그 목록 반환

    Returns:
        {
            "success": true,
            "leagues": ["프리미어리그", "라리가", ...]
        }
    """
    try:
        json_file = os.path.join(os.path.dirname(__file__), '../data/espn_player_ids.json')

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        leagues = list(data.keys())

        return {
            "success": True,
            "leagues": leagues,
            "count": len(leagues)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"리그 목록 로드 실패: {str(e)}"
        )


@router.get("/player/{player_name}", summary="선수 개인 통계")
async def get_player_stats(player_name: str):
    """
    선수 이름으로 통계 조회

    - **player_name**: 선수 이름 (영문, 예: "Erling Haaland")

    Returns:
        {
            "success": true,
            "name": "Erling Haaland",
            "espn_id": 253989,
            "team": "Manchester City",
            "goals": 15,
            "assists": 3,
            "matches": 20
        }
    """
    # 1. 캐시에서 ESPN ID 찾기
    espn_id = find_espn_id(player_name)

    if not espn_id:
        raise HTTPException(
            status_code=404,
            detail=f"'{player_name}' 선수를 찾을 수 없습니다."
        )

    # 2. ESPN에서 최신 통계 스크래핑
    stats = scrape_espn_stats(espn_id, player_name)

    if not stats:
        raise HTTPException(
            status_code=500,
            detail="통계 수집에 실패했습니다."
        )

    return {
        "success": True,
        "name": player_name,
        "espn_id": espn_id,
        **stats,
        "timestamp": datetime.now().isoformat()
    }
