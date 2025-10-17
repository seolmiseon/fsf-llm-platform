"""
External APIs 패키지

외부 API 클라이언트 모음
- Football-Data.org
- YouTube API (선택사항)
"""

from .football_data import FootballDataClient

__all__ = [
    "FootballDataClient",
]