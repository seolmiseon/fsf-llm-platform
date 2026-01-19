"""
Weather Tool
경기장 위치 기반으로 날씨 정보를 조회합니다.
캐싱을 적용하여 API 호출을 최소화합니다.

캐싱 전략 (2계층):
1. 메모리 캐시: 즉시 응답 (서버 재시작 시 초기화)
2. Firestore 캐시: 영구 저장 (1시간 TTL - 날씨는 자주 바뀜)

WeatherAPI.com 무료 티어: 1M calls/month
"""
from langchain.tools import Tool
from typing import Optional, Dict
import logging
import os
import hashlib
import asyncio
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# 메모리 캐시 (간단한 TTL 캐시) - 1차 캐시
_weather_cache: Dict[str, Dict] = {}
CACHE_TTL_HOURS = 1  # 1시간 캐시 (날씨는 자주 변함)

# CacheService 인스턴스 (지연 로딩) - 2차 캐시 (Firestore)
_cache_service = None

# 주요 축구 경기장 위치 매핑 (팀명 → 도시)
STADIUM_LOCATIONS = {
    # 프리미어리그
    "토트넘": "London",
    "tottenham": "London",
    "spurs": "London",
    "아스날": "London",
    "arsenal": "London",
    "첼시": "London",
    "chelsea": "London",
    "웨스트햄": "London",
    "west ham": "London",
    "맨유": "Manchester",
    "맨체스터 유나이티드": "Manchester",
    "manchester united": "Manchester",
    "맨시티": "Manchester",
    "맨체스터 시티": "Manchester",
    "manchester city": "Manchester",
    "리버풀": "Liverpool",
    "liverpool": "Liverpool",
    "에버튼": "Liverpool",
    "everton": "Liverpool",
    "뉴캐슬": "Newcastle",
    "newcastle": "Newcastle",
    "브라이튼": "Brighton",
    "brighton": "Brighton",
    "아스톤빌라": "Birmingham",
    "aston villa": "Birmingham",
    "레스터": "Leicester",
    "leicester": "Leicester",
    "울버햄튼": "Wolverhampton",
    "wolves": "Wolverhampton",
    "본머스": "Bournemouth",
    "bournemouth": "Bournemouth",
    "노팅엄": "Nottingham",
    "nottingham forest": "Nottingham",
    "풀럼": "London",
    "fulham": "London",
    "크리스탈 팰리스": "London",
    "crystal palace": "London",
    "브렌트포드": "London",
    "brentford": "London",
    "입스위치": "Ipswich",
    "ipswich": "Ipswich",
    "사우샘프턴": "Southampton",
    "southampton": "Southampton",

    # 라리가
    "바르셀로나": "Barcelona",
    "barcelona": "Barcelona",
    "레알마드리드": "Madrid",
    "레알 마드리드": "Madrid",
    "real madrid": "Madrid",
    "아틀레티코": "Madrid",
    "atletico madrid": "Madrid",

    # 분데스리가
    "바이에른": "Munich",
    "bayern": "Munich",
    "도르트문트": "Dortmund",
    "dortmund": "Dortmund",
    "라이프치히": "Leipzig",
    "leipzig": "Leipzig",

    # 세리에A
    "유벤투스": "Turin",
    "juventus": "Turin",
    "인터밀란": "Milan",
    "inter milan": "Milan",
    "ac밀란": "Milan",
    "ac milan": "Milan",
    "나폴리": "Naples",
    "napoli": "Naples",
    "로마": "Rome",
    "roma": "Rome",

    # 리그앙
    "파리생제르망": "Paris",
    "psg": "Paris",
    "paris saint-germain": "Paris",
}


def get_cache_service():
    """CacheService 인스턴스 반환 (싱글톤, 지연 로딩)"""
    global _cache_service
    if _cache_service is None:
        try:
            from ..services.cache_service import CacheService
            _cache_service = CacheService()
            logger.info("✅ Weather Tool용 CacheService 연결")
        except Exception as e:
            logger.warning(f"⚠️ CacheService 연결 실패 (메모리 캐시만 사용): {e}")
    return _cache_service


def _get_cache_key(location: str, days: int) -> str:
    """캐시 키 생성"""
    normalized = f"{location.lower().strip()}_{days}"
    return hashlib.md5(normalized.encode()).hexdigest()


def _get_from_memory_cache(location: str, days: int) -> Optional[Dict]:
    """메모리 캐시에서 조회 (1차)"""
    cache_key = _get_cache_key(location, days)
    if cache_key in _weather_cache:
        cached = _weather_cache[cache_key]
        if datetime.now() < cached["expires_at"]:
            logger.info(f"✅ Weather 메모리 캐시 HIT: {location}")
            return cached["data"]
        else:
            del _weather_cache[cache_key]
            logger.info(f"🗑️ 만료된 Weather 메모리 캐시 삭제: {location}")
    return None


def _get_from_firestore_cache(location: str, days: int) -> Optional[Dict]:
    """Firestore 캐시에서 조회 (2차)"""
    cache_service = get_cache_service()
    if not cache_service:
        return None

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    cache_service.get_cached_api_data("weather", {"location": location, "days": days})
                )
                cached = future.result(timeout=5)
        else:
            cached = loop.run_until_complete(
                cache_service.get_cached_api_data("weather", {"location": location, "days": days})
            )

        if cached and cached.get("data"):
            logger.info(f"✅ Weather Firestore 캐시 HIT: {location}")
            _save_to_memory_cache(location, days, cached["data"])
            return cached["data"]
    except Exception as e:
        logger.warning(f"⚠️ Firestore 캐시 조회 실패: {e}")

    return None


def _save_to_memory_cache(location: str, days: int, data: Dict):
    """메모리 캐시에 저장 (1차)"""
    cache_key = _get_cache_key(location, days)
    _weather_cache[cache_key] = {
        "data": data,
        "expires_at": datetime.now() + timedelta(hours=CACHE_TTL_HOURS),
        "created_at": datetime.now()
    }
    logger.info(f"💾 Weather 메모리 캐시 저장: {location}")


def _save_to_firestore_cache(location: str, days: int, data: Dict):
    """Firestore 캐시에 저장 (2차)"""
    cache_service = get_cache_service()
    if not cache_service:
        return

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    cache_service.cache_api_data(
                        "weather",
                        {"location": location, "days": days},
                        data,
                        ttl_hours=CACHE_TTL_HOURS
                    )
                )
                future.result(timeout=5)
        else:
            loop.run_until_complete(
                cache_service.cache_api_data(
                    "weather",
                    {"location": location, "days": days},
                    data,
                    ttl_hours=CACHE_TTL_HOURS
                )
            )
        logger.info(f"💾 Weather Firestore 캐시 저장: {location}")
    except Exception as e:
        logger.warning(f"⚠️ Firestore 캐시 저장 실패: {e}")


def _find_location_from_team(query: str) -> Optional[str]:
    """팀명에서 도시 찾기"""
    query_lower = query.lower()
    for team, city in STADIUM_LOCATIONS.items():
        if team in query_lower:
            return city
    return None


def get_weather(location: str, days: int = 3) -> str:
    """
    특정 위치의 날씨 정보를 조회합니다.

    Args:
        location: 도시명 또는 팀명 (예: "London", "토트넘", "Manchester")
        days: 예보 일수 (1-10일, 기본값: 3일)

    Returns:
        날씨 정보 문자열
    """
    try:
        # 팀명에서 도시 찾기
        city = _find_location_from_team(location)
        if city:
            logger.info(f"🏟️ 팀명 '{location}' → 도시 '{city}' 매핑")
            location = city

        # days 범위 제한 (WeatherAPI 무료 티어: 최대 3일 예보)
        days = min(max(days, 1), 3)

        # 1차 캐시: 메모리 캐시 확인
        cached = _get_from_memory_cache(location, days)
        if cached:
            return cached["formatted_result"]

        # 2차 캐시: Firestore 캐시 확인
        cached = _get_from_firestore_cache(location, days)
        if cached:
            return cached["formatted_result"]

        # Weather API 호출
        api_key = os.getenv("WEATHER_API_KEY")
        if not api_key:
            return "WEATHER_API_KEY 환경변수가 설정되지 않았습니다."

        url = f"http://api.weatherapi.com/v1/forecast.json"
        params = {
            "key": api_key,
            "q": location,
            "days": days,
            "aqi": "no",
            "alerts": "no",
            "lang": "ko"
        }

        logger.info(f"🌤️ Weather API 호출: {location} ({days}일)")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # 결과 포맷팅
        loc = data.get("location", {})
        current = data.get("current", {})
        forecast = data.get("forecast", {}).get("forecastday", [])

        city_name = loc.get("name", location)
        country = loc.get("country", "")

        result_lines = [f"🌤️ {city_name}, {country} 날씨 정보\n"]

        # 현재 날씨
        result_lines.append("📍 현재 날씨:")
        result_lines.append(f"   🌡️ 온도: {current.get('temp_c', 'N/A')}°C (체감 {current.get('feelslike_c', 'N/A')}°C)")
        result_lines.append(f"   ☁️ 상태: {current.get('condition', {}).get('text', 'N/A')}")
        result_lines.append(f"   💧 습도: {current.get('humidity', 'N/A')}%")
        result_lines.append(f"   💨 바람: {current.get('wind_kph', 'N/A')} km/h")
        result_lines.append("")

        # 예보
        if forecast:
            result_lines.append(f"📅 {days}일 예보:")
            for day_data in forecast:
                date = day_data.get("date", "")
                day = day_data.get("day", {})

                max_temp = day.get("maxtemp_c", "N/A")
                min_temp = day.get("mintemp_c", "N/A")
                condition = day.get("condition", {}).get("text", "N/A")
                rain_chance = day.get("daily_chance_of_rain", 0)

                result_lines.append(f"   {date}: {condition}")
                result_lines.append(f"      🌡️ {min_temp}°C ~ {max_temp}°C, 🌧️ 강수확률 {rain_chance}%")

        formatted_result = "\n".join(result_lines)

        # 캐시 저장
        cache_data = {
            "location": location,
            "city_name": city_name,
            "country": country,
            "current": current,
            "forecast": forecast,
            "formatted_result": formatted_result,
            "timestamp": datetime.now().isoformat()
        }
        _save_to_memory_cache(location, days, cache_data)
        _save_to_firestore_cache(location, days, cache_data)

        logger.info(f"✅ Weather 조회 완료: {city_name}")
        return formatted_result

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Weather API 요청 오류: {e}")
        return f"날씨 정보를 가져오는 중 오류가 발생했습니다: {str(e)}"
    except Exception as e:
        logger.error(f"❌ Weather 조회 오류: {e}", exc_info=True)
        return f"날씨 조회 중 오류가 발생했습니다: {str(e)}"


def weather_query(query: str) -> str:
    """
    자연어 쿼리를 파싱하여 날씨 정보를 조회합니다.

    Args:
        query: 자연어 쿼리 (예: "런던 날씨", "토트넘 경기장 날씨", "맨체스터 주말 날씨")

    Returns:
        날씨 정보 문자열
    """
    # 불필요한 키워드 제거
    search_terms = query.strip()
    remove_keywords = ["날씨", "weather", "알려줘", "어때", "어떠니", "경기장", "스타디움"]
    for keyword in remove_keywords:
        search_terms = search_terms.replace(keyword, "").strip()

    if not search_terms:
        return "위치를 입력해주세요. 예: '런던 날씨', '토트넘 경기장 날씨'"

    # 일수 파싱
    days = 3
    if "오늘" in query:
        days = 1
    elif "내일" in query:
        days = 2
    elif "주말" in query or "이번주" in query:
        days = 3

    return get_weather(search_terms, days)


# LangChain Tool로 변환
WeatherTool = Tool(
    name="weather",
    description="경기장이나 특정 도시의 날씨 정보를 조회하는 도구입니다. 팀명(토트넘, 맨유 등)을 입력하면 해당 경기장 도시의 날씨를 알려줍니다. 경기 관람 계획 시 유용합니다. 예: '런던 날씨', '토트넘 경기장 날씨', '맨체스터 주말 날씨'",
    func=weather_query
)
