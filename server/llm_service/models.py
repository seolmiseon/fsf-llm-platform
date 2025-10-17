

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# 1. AI 챗봇 (Chat) 관련 모델
# ============================================

class ChatRequest(BaseModel):
    """AI 챗봇 요청"""
    query: str = Field(..., description="사용자 질문", example="손흥민 최근 폼은?")
    top_k: int = Field(default=5, description="RAG 검색 결과 개수", ge=1, le=20)
    context: Optional[str] = Field(default=None, description="추가 컨텍스트")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "토트넘 이번 시즌 전력은?",
                "top_k": 5
            }
        }


class ChatResponse(BaseModel):
    """AI 챗봇 응답"""
    answer: str = Field(..., description="AI 답변")
    sources: List[str] = Field(default=[], description="참고한 문서들")
    tokens_used: int = Field(default=0, description="사용된 토큰 수")
    confidence: float = Field(default=0.0, description="답변 신뢰도 (0-1)", ge=0, le=1)

    class Config:
        json_schema_extra = {
            "example": {
                "answer": "손흥민은 최근 5경기에서 3골 2도움을 기록하며...",
                "sources": ["match_20250101", "player_stats_sonny"],
                "tokens_used": 342,
                "confidence": 0.95
            }
        }


# ============================================
# 2. 경기 분석 (Match Analysis) 관련 모델
# ============================================

class MatchAnalysisRequest(BaseModel):
    """경기 분석 요청"""
    match_id: int = Field(..., description="경기 ID (Football-Data API)", example=401828)
    detail_level: str = Field(
        default="standard",
        description="분석 상세도",
        pattern="^(brief|standard|detailed)$"
    )
    include_prediction: bool = Field(default=False, description="경기 결과 예측 포함 여부")

    class Config:
        json_schema_extra = {
            "example": {
                "match_id": 401828,
                "detail_level": "standard",
                "include_prediction": True
            }
        }


class MatchStats(BaseModel):
    """경기 통계"""
    possession: Optional[float] = Field(default=None, description="볼 점유율 (%)")
    shots: Optional[int] = Field(default=None, description="총 슈팅")
    shots_on_target: Optional[int] = Field(default=None, description="유효 슈팅")
    passes: Optional[int] = Field(default=None, description="패스 수")
    tackles: Optional[int] = Field(default=None, description="태클")
    fouls: Optional[int] = Field(default=None, description="파울")


class MatchAnalysisResponse(BaseModel):
    """경기 분석 응답"""
    match_id: int = Field(..., description="경기 ID")
    home_team: str = Field(..., description="홈 팀")
    away_team: str = Field(..., description="어웨이 팀")
    score: str = Field(..., description="최종 스코어", example="3-1")
    
    # 분석 내용
    analysis: str = Field(..., description="경기 상세 분석")
    key_moments: List[str] = Field(default=[], description="주요 장면들")
    player_highlights: List[str] = Field(default=[], description="선수 하이라이트")
    
    # 통계
    home_stats: Optional[MatchStats] = Field(default=None, description="홈 팀 통계")
    away_stats: Optional[MatchStats] = Field(default=None, description="어웨이 팀 통계")
    
    # 예측 (선택)
    prediction: Optional[str] = Field(default=None, description="경기 결과 예측")
    tokens_used: int = Field(default=0, description="사용된 토큰 수")

    class Config:
        json_schema_extra = {
            "example": {
                "match_id": 401828,
                "home_team": "Manchester City",
                "away_team": "Chelsea",
                "score": "3-1",
                "analysis": "맨시티가 첼시를 압도했습니다...",
                "key_moments": ["홀란드 10분 선제골", "첼시 25분 동점"],
                "player_highlights": ["홀란드: 3골", "사카: 2도움"],
                "home_stats": {"possession": 68, "shots": 18, "shots_on_target": 8},
                "away_stats": {"possession": 32, "shots": 6, "shots_on_target": 2}
            }
        }


# ============================================
# 3. 선수 비교 (Player Compare) 관련 모델
# ============================================

class PlayerCompareRequest(BaseModel):
    """선수 비교 요청"""
    player1_id: int = Field(..., description="선수1 ID (Football-Data API)", example=44)
    player2_id: int = Field(..., description="선수2 ID (Football-Data API)", example=45)
    metrics: Optional[List[str]] = Field(
        default=None,
        description="비교 지표 (goals, assists, rating, passes, tackles 등)"
    )
    season: Optional[str] = Field(default="2024-25", description="시즌", example="2024-25")

    class Config:
        json_schema_extra = {
            "example": {
                "player1_id": 44,
                "player2_id": 45,
                "metrics": ["goals", "assists", "rating", "passes"],
                "season": "2024-25"
            }
        }


class PlayerStats(BaseModel):
    """선수 통계"""
    player_id: int = Field(..., description="선수 ID")
    player_name: str = Field(..., description="선수명")
    team: str = Field(..., description="소속팀")
    position: str = Field(..., description="포지션")
    
    goals: Optional[int] = Field(default=None, description="골")
    assists: Optional[int] = Field(default=None, description="도움")
    matches_played: Optional[int] = Field(default=None, description="출전")
    minutes_played: Optional[int] = Field(default=None, description="출전시간")
    passes: Optional[int] = Field(default=None, description="패스")
    pass_completion: Optional[float] = Field(default=None, description="패스 성공률 (%)")
    tackles: Optional[int] = Field(default=None, description="태클")
    rating: Optional[float] = Field(default=None, description="평점", ge=0, le=10)


class PlayerCompareResponse(BaseModel):
    """선수 비교 응답"""
    player1: PlayerStats = Field(..., description="선수1 통계")
    player2: PlayerStats = Field(..., description="선수2 통계")
    
    comparison_analysis: str = Field(..., description="비교 분석")
    strengths_p1: List[str] = Field(default=[], description="선수1 강점")
    strengths_p2: List[str] = Field(default=[], description="선수2 강점")
    weaknesses_p1: List[str] = Field(default=[], description="선수1 약점")
    weaknesses_p2: List[str] = Field(default=[], description="선수2 약점")
    
    verdict: Optional[str] = Field(default=None, description="최종 평가")
    tokens_used: int = Field(default=0, description="사용된 토큰 수")

    class Config:
        json_schema_extra = {
            "example": {
                "player1": {
                    "player_id": 44,
                    "player_name": "Erling Haaland",
                    "team": "Manchester City",
                    "position": "Forward",
                    "goals": 28,
                    "assists": 5
                },
                "player2": {
                    "player_id": 45,
                    "player_name": "Harry Kane",
                    "team": "Bayern Munich",
                    "position": "Forward",
                    "goals": 22,
                    "assists": 12
                },
                "comparison_analysis": "홀란드는 순수 득점력이, 케인은 플레이메이킹이 뛰어납니다...",
                "strengths_p1": ["득점력", "피지컬"],
                "strengths_p2": ["플레이메이킹", "경험"],
                "verdict": "순수 득점력은 홀란드, 팀 기여도는 케인이 우수합니다."
            }
        }


# ============================================
# 4. RAG 관련 모델
# ============================================

class RAGDocument(BaseModel):
    """벡터 데이터베이스에 저장되는 문서"""
    doc_id: str = Field(..., description="문서 고유 ID", example="match_20250101_pl")
    content: str = Field(..., description="문서 내용")
    metadata: dict = Field(
        default={},
        description="메타데이터 (팀, 선수, 경기ID 등)"
    )
    source: str = Field(..., description="출처", example="football_data_api")
    timestamp: datetime = Field(default_factory=datetime.now, description="생성 시간")


class RAGSearchResult(BaseModel):
    """RAG 검색 결과"""
    doc_id: str = Field(..., description="문서 ID")
    content: str = Field(..., description="문서 내용")
    similarity_score: float = Field(..., description="유사도 (0-1)", ge=0, le=1)
    metadata: dict = Field(default={}, description="메타데이터")


# ============================================
# 5. 에러/상태 모델
# ============================================

class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str = Field(..., description="에러 메시지")
    error_code: str = Field(..., description="에러 코드", example="INVALID_QUERY")
    details: Optional[dict] = Field(default=None, description="상세 정보")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Invalid match ID",
                "error_code": "INVALID_MATCH_ID",
                "details": {"match_id": 999999}
            }
        }


class HealthCheckResponse(BaseModel):
    """헬스 체크 응답"""
    status: str = Field(..., description="상태", example="healthy")
    service: str = Field(..., description="서비스명", example="fsf_llm_service")
    version: str = Field(..., description="버전", example="0.1.0")
    timestamp: datetime = Field(default_factory=datetime.now, description="시간")