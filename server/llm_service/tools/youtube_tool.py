"""
YouTube 하이라이트 Tool
경기 정보를 바탕으로 YouTube에서 하이라이트 영상을 검색합니다.
캐싱을 적용하여 API 호출을 최소화합니다.

캐싱 전략 (2계층):
1. 메모리 캐시: 즉시 응답 (서버 재시작 시 초기화)
2. Firestore 캐시: 영구 저장 (24시간 TTL)
"""
from langchain.tools import Tool
from typing import Optional, List, Dict
import logging
import os
import hashlib
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# YouTube API 클라이언트 (싱글톤)
_youtube_client = None

# 메모리 캐시 (간단한 TTL 캐시) - 1차 캐시
_youtube_cache: Dict[str, Dict] = {}
CACHE_TTL_HOURS = 24  # 24시간 캐시

# CacheService 인스턴스 (지연 로딩) - 2차 캐시 (Firestore)
_cache_service = None


def get_cache_service():
    """CacheService 인스턴스 반환 (싱글톤, 지연 로딩)"""
    global _cache_service
    if _cache_service is None:
        try:
            from ..services.cache_service import CacheService
            _cache_service = CacheService()
            logger.info("✅ YouTube Tool용 CacheService 연결")
        except Exception as e:
            logger.warning(f"⚠️ CacheService 연결 실패 (메모리 캐시만 사용): {e}")
    return _cache_service


def get_youtube_client():
    """YouTube API 클라이언트 반환 (싱글톤)"""
    global _youtube_client
    if _youtube_client is None:
        try:
            from googleapiclient.discovery import build
            api_key = os.getenv("YOUTUBE_API_KEY")
            if not api_key:
                logger.error("❌ YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.")
                return None
            _youtube_client = build("youtube", "v3", developerKey=api_key)
            logger.info("✅ YouTube API 클라이언트 초기화 완료")
        except Exception as e:
            logger.error(f"❌ YouTube API 클라이언트 초기화 실패: {e}")
            return None
    return _youtube_client


def _get_cache_key(query: str) -> str:
    """캐시 키 생성"""
    normalized = query.lower().strip()
    return hashlib.md5(normalized.encode()).hexdigest()


def _get_from_memory_cache(query: str) -> Optional[Dict]:
    """메모리 캐시에서 조회 (1차)"""
    cache_key = _get_cache_key(query)
    if cache_key in _youtube_cache:
        cached = _youtube_cache[cache_key]
        # TTL 확인
        if datetime.now() < cached["expires_at"]:
            logger.info(f"✅ YouTube 메모리 캐시 HIT: {query[:30]}...")
            return cached["data"]
        else:
            # 만료된 캐시 삭제
            del _youtube_cache[cache_key]
            logger.info(f"🗑️ 만료된 YouTube 메모리 캐시 삭제: {query[:30]}...")
    return None


def _get_from_firestore_cache(query: str) -> Optional[Dict]:
    """Firestore 캐시에서 조회 (2차)"""
    cache_service = get_cache_service()
    if not cache_service:
        return None

    try:
        # 동기 함수에서 비동기 호출을 위해
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # 이미 이벤트 루프가 실행 중이면 새 태스크로 실행
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    cache_service.get_cached_api_data("youtube_highlights", {"query": query})
                )
                cached = future.result(timeout=5)
        else:
            cached = loop.run_until_complete(
                cache_service.get_cached_api_data("youtube_highlights", {"query": query})
            )

        if cached and cached.get("data"):
            logger.info(f"✅ YouTube Firestore 캐시 HIT: {query[:30]}...")
            # 메모리 캐시에도 저장 (다음 요청 가속)
            _save_to_memory_cache(query, cached["data"])
            return cached["data"]
    except Exception as e:
        logger.warning(f"⚠️ Firestore 캐시 조회 실패: {e}")

    return None


def _save_to_memory_cache(query: str, data: Dict):
    """메모리 캐시에 저장 (1차)"""
    cache_key = _get_cache_key(query)
    _youtube_cache[cache_key] = {
        "data": data,
        "expires_at": datetime.now() + timedelta(hours=CACHE_TTL_HOURS),
        "created_at": datetime.now()
    }
    logger.info(f"💾 YouTube 메모리 캐시 저장: {query[:30]}...")


def _save_to_firestore_cache(query: str, data: Dict):
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
                        "youtube_highlights",
                        {"query": query},
                        data,
                        ttl_hours=CACHE_TTL_HOURS
                    )
                )
                future.result(timeout=5)
        else:
            loop.run_until_complete(
                cache_service.cache_api_data(
                    "youtube_highlights",
                    {"query": query},
                    data,
                    ttl_hours=CACHE_TTL_HOURS
                )
            )
        logger.info(f"💾 YouTube Firestore 캐시 저장: {query[:30]}...")
    except Exception as e:
        logger.warning(f"⚠️ Firestore 캐시 저장 실패: {e}")


def search_youtube_highlights(query: str, max_results: int = 5) -> str:
    """
    YouTube에서 축구 하이라이트 영상을 검색합니다.

    Args:
        query: 검색어 (예: "토트넘 vs 아스날 하이라이트", "손흥민 골")
        max_results: 최대 결과 수 (기본값: 5, 최대: 10)

    Returns:
        검색 결과 문자열 (영상 제목, URL, 채널명 포함)
    """
    try:
        # 1차 캐시: 메모리 캐시 확인 (비용 $0, 가장 빠름)
        cached = _get_from_memory_cache(query)
        if cached:
            return cached["formatted_result"]

        # 2차 캐시: Firestore 캐시 확인 (비용 $0)
        cached = _get_from_firestore_cache(query)
        if cached:
            return cached["formatted_result"]

        # 2. YouTube API 호출 (100 units 소비)
        youtube = get_youtube_client()
        if not youtube:
            return "YouTube API 클라이언트를 초기화할 수 없습니다. YOUTUBE_API_KEY를 확인해주세요."

        # 검색어 최적화: "하이라이트" 키워드 추가
        search_query = query
        if "하이라이트" not in query.lower() and "highlight" not in query.lower():
            search_query = f"{query} 하이라이트"

        # max_results 제한 (비용 절감)
        max_results = min(max_results, 10)

        logger.info(f"🔍 YouTube API 호출: {search_query}")

        request = youtube.search().list(
            part="snippet",
            q=search_query,
            type="video",
            maxResults=max_results,
            order="relevance",
            relevanceLanguage="ko",  # 한국어 우선
            videoDuration="medium",  # 중간 길이 (하이라이트는 보통 4-20분)
        )
        response = request.execute()

        items = response.get("items", [])

        if not items:
            result = f"'{query}'에 대한 하이라이트 영상을 찾을 수 없습니다."
            return result

        # 3. 결과 포맷팅
        result_lines = [f"🎬 '{query}' 하이라이트 영상 ({len(items)}개):\n"]

        videos = []
        for i, item in enumerate(items, 1):
            snippet = item.get("snippet", {})
            video_id = item.get("id", {}).get("videoId", "")
            title = snippet.get("title", "제목 없음")
            channel = snippet.get("channelTitle", "알 수 없음")
            published_at = snippet.get("publishedAt", "")

            # 날짜 포맷팅
            try:
                pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                date_str = pub_date.strftime("%Y-%m-%d")
            except:
                date_str = ""

            video_url = f"https://www.youtube.com/watch?v={video_id}"

            result_lines.append(f"[{i}] {title}")
            result_lines.append(f"    📺 채널: {channel}")
            if date_str:
                result_lines.append(f"    📅 업로드: {date_str}")
            result_lines.append(f"    🔗 링크: {video_url}")
            result_lines.append("")

            videos.append({
                "title": title,
                "video_id": video_id,
                "url": video_url,
                "channel": channel,
                "published_at": published_at
            })

        formatted_result = "\n".join(result_lines)

        # 4. 캐시 저장 (다음 요청에 재사용)
        cache_data = {
            "videos": videos,
            "formatted_result": formatted_result,
            "query": query,
            "timestamp": datetime.now().isoformat()
        }
        # 메모리 캐시 저장 (1차)
        _save_to_memory_cache(query, cache_data)
        # Firestore 캐시 저장 (2차, 영구)
        _save_to_firestore_cache(query, cache_data)

        logger.info(f"✅ YouTube 검색 완료: {len(videos)}개 영상")
        return formatted_result

    except Exception as e:
        logger.error(f"❌ YouTube 검색 오류: {e}", exc_info=True)
        return f"YouTube 검색 중 오류가 발생했습니다: {str(e)}"


def youtube_query(query: str) -> str:
    """
    자연어 쿼리를 파싱하여 YouTube 하이라이트를 검색합니다.

    Args:
        query: 자연어 쿼리 (예: "맨유 리버풀 경기 하이라이트", "손흥민 골 영상")

    Returns:
        YouTube 검색 결과 문자열
    """
    # 검색어 정제
    search_terms = query.strip()

    # "영상", "비디오", "보여줘" 등 불필요한 키워드 제거
    remove_keywords = ["영상", "비디오", "보여줘", "찾아줘", "검색해줘", "알려줘"]
    for keyword in remove_keywords:
        search_terms = search_terms.replace(keyword, "").strip()

    # 빈 검색어 처리
    if not search_terms:
        return "검색어를 입력해주세요. 예: '토트넘 vs 아스날 하이라이트'"

    return search_youtube_highlights(search_terms)


# LangChain Tool로 변환
YouTubeHighlightTool = Tool(
    name="youtube_highlight",
    description="축구 경기 하이라이트 영상을 YouTube에서 검색하는 도구입니다. 경기 하이라이트, 골 장면, 선수 플레이 영상 등을 찾을 때 사용합니다. 예: '토트넘 vs 아스날 하이라이트', '손흥민 골 영상'",
    func=youtube_query
)
