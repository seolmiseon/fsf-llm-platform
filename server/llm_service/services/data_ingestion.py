"""
Football-Data → 벡터 데이터베이스 변환 파이프라인
(팀 정보 수집 부분 수정)
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)

class DataIngestionService:
    """
    Football-Data.org API 데이터를 수집해서 
    ChromaDB에 저장할 형식으로 변환하는 서비스
    """
    
    def __init__(self, football_client, openai_service):
        """
        초기화
        
        Args:
            football_client: FootballDataClient 인스턴스
            openai_service: OpenAIService 인스턴스
        """
        self.football_client = football_client
        self.openai_service = openai_service
        logger.info("✅ DataIngestionService 초기화")
    
    def format_match_document(self, match: Dict[str, Any]) -> Dict[str, Any]:
        """경기 정보를 문서 형식으로 변환"""
        try:
            match_id = match.get("id")
            home_team = match.get("homeTeam", {})
            away_team = match.get("awayTeam", {})
            score = match.get("score", {}).get("fullTime", {})
            utc_date = match.get("utcDate", "")
            status = match.get("status", "UNKNOWN")
            
            home_name = home_team.get("name", "Unknown")
            away_name = away_team.get("name", "Unknown")
            home_score = score.get("home", 0)
            away_score = score.get("away", 0)
            
            # 날짜 포맷
            date_str = ""
            if utc_date:
                try:
                    date_obj = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
                    date_str = date_obj.strftime("%Y-%m-%d %H:%M")
                except:
                    date_str = utc_date
            
            # 문서 생성
            document = (
                f"{home_name} vs {away_name} "
                f"({home_score}-{away_score}) | "
                f"{date_str} | "
                f"상태: {status}"
            )
            
            # 메타데이터
            metadata = {
                "match_id": match_id,
                "home_team": home_name,
                "home_team_id": home_team.get("id"),
                "away_team": away_name,
                "away_team_id": away_team.get("id"),
                "home_score": home_score,
                "away_score": away_score,
                "date": date_str,
                "status": status,
                "type": "match",
                "timestamp": datetime.now().isoformat()
            }
            
            return {
                "document": document,
                "metadata": metadata,
                "id": f"match_{match_id}"
            }
        
        except Exception as e:
            logger.error(f"❌ 경기 문서 변환 실패: {e}")
            return None
    
    def format_standing_document(
        self,
        competition: str,
        table: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """순위표를 문서 형식으로 변환"""
        try:
            documents = []
            
            for entry in table:
                position = entry.get("position", "?")
                team = entry.get("team", {})
                team_name = team.get("name", "Unknown")
                team_id = team.get("id")
                
                points = entry.get("points", 0)
                wins = entry.get("won", 0)
                draws = entry.get("draw", 0)
                losses = entry.get("lost", 0)
                goals_for = entry.get("goalsFor", 0)
                goals_against = entry.get("goalsAgainst", 0)
                goal_diff = entry.get("goalDifference", 0)
                
                # 문서 생성
                document = (
                    f"{competition} 순위: {position}위 {team_name} "
                    f"({points}포인트, {wins}승 {draws}무 {losses}패) | "
                    f"골: {goals_for} 득점 {goals_against} 실점 (±{goal_diff})"
                )
                
                # 메타데이터
                metadata = {
                    "competition": competition,
                    "position": position,
                    "team": team_name,
                    "team_id": team_id,
                    "points": points,
                    "wins": wins,
                    "draws": draws,
                    "losses": losses,
                    "goal_difference": goal_diff,
                    "type": "standing",
                    "timestamp": datetime.now().isoformat()
                }
                
                documents.append({
                    "document": document,
                    "metadata": metadata,
                    "id": f"standing_{competition}_{position}"
                })
            
            return documents
        
        except Exception as e:
            logger.error(f"❌ 순위표 문서 변환 실패: {e}")
            return []
    
    def format_team_document(self, team: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """팀 정보를 문서 형식으로 변환"""
        try:
            team_id = team.get("id")
            team_name = team.get("name", "Unknown")
            short_name = team.get("shortName", "")
            founded = team.get("founded", "")
            venue = team.get("venue", "")
            
            # 문서 생성
            document = (
                f"팀: {team_name} ({short_name}) | "
                f"설립: {founded} | "
                f"홈구장: {venue}"
            )
            
            # 메타데이터
            metadata = {
                "team_id": team_id,
                "team": team_name,
                "short_name": short_name,
                "founded": founded,
                "venue": venue,
                "type": "team",
                "timestamp": datetime.now().isoformat()
            }
            
            return {
                "document": document,
                "metadata": metadata,
                "id": f"team_{team_id}"
            }
        
        except Exception as e:
            logger.error(f"❌ 팀 문서 변환 실패: {e}")
            return None
    
    async def ingest_recent_matches(
        self,
        competition: str = "PL",
        days_back: int = 7,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """최근 경기 정보 수집"""
        try:
            logger.info(f"📥 {competition} 최근 {days_back}일 경기 수집 중...")
            
            # API에서 데이터 가져오기
            matches = self.football_client.get_matches(
                competition=competition,
                status="FINISHED",
                limit=limit
            )
            
            if not matches:
                logger.warning(f"⚠️ {competition} 경기 데이터 없음")
                return []
            
            # 문서 변환
            documents = []
            for match in matches:
                doc = self.format_match_document(match)
                if doc:
                    documents.append(doc)
            
            logger.info(f"✅ {len(documents)}개 경기 수집 완료")
            return documents
        
        except Exception as e:
            logger.error(f"❌ 경기 수집 실패: {e}")
            return []
    
    async def ingest_standings(
        self,
        competitions: List[str] = ["PL", "LA", "BL"]
    ) -> List[Dict[str, Any]]:
        """여러 리그의 순위표 수집"""
        try:
            all_documents = []
            
            for comp in competitions:
                logger.info(f"📥 {comp} 순위표 수집 중...")
                
                standings = self.football_client.get_standings(comp)
                
                if not standings:
                    logger.warning(f"⚠️ {comp} 순위표 없음")
                    continue
                
                # 첫 번째 테이블(리그 순위)에서 문서 생성
                tables = standings.get("standings", [])
                if tables and len(tables) > 0:
                    table = tables[0].get("table", [])
                    
                    docs = self.format_standing_document(comp, table)
                    all_documents.extend(docs)
            
            logger.info(f"✅ 총 {len(all_documents)}개 순위 문서 수집 완료")
            return all_documents
        
        except Exception as e:
            logger.error(f"❌ 순위표 수집 실패: {e}")
            return []
    
    async def ingest_teams(
        self,
        competition: str = "PL"
    ) -> List[Dict[str, Any]]:
        """
        특정 리그의 모든 팀 정보 수집
        
        ✅ 수정: get_teams() → get_teams_by_competition()
        """
        try:
            logger.info(f"📥 {competition} 팀 정보 수집 중...")
            
            # ✅ 올바른 메서드명 사용
            teams_data = self.football_client.get_teams_by_competition(competition)
            
            if not teams_data:
                logger.warning(f"⚠️ {competition} 팀 정보 없음")
                return []
            
            documents = []
            for team in teams_data:
                doc = self.format_team_document(team)
                if doc:
                    documents.append(doc)
            
            logger.info(f"✅ {len(documents)}개 팀 정보 수집 완료")
            return documents
        
        except Exception as e:
            logger.error(f"❌ 팀 정보 수집 실패: {e}")
            return []
    
    async def embed_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """문서 리스트를 임베딩과 함께 반환"""
        try:
            logger.info(f"🔢 {len(documents)}개 문서 임베딩 중...")
            
            # 텍스트만 추출
            texts = [doc["document"] for doc in documents]
            
            # 일괄 임베딩
            embeddings = self.openai_service.embeddings_batch(texts)
            
            # 임베딩 추가
            for i, doc in enumerate(documents):
                doc["embedding"] = embeddings[i]
            
            logger.info(f"✅ 임베딩 완료")
            return documents
        
        except Exception as e:
            logger.error(f"❌ 임베딩 실패: {e}")
            return []
    
    async def full_pipeline(
        self,
        competitions: List[str] = ["PL", "LA", "BL"]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        전체 데이터 수집 파이프라인
        
        경기 + 순위표 + 팀 정보 모두 수집해서 임베딩
        """
        try:
            logger.info("🚀 전체 데이터 수집 파이프라인 시작...")
            
            result = {
                "matches": [],
                "standings": [],
                "teams": []
            }
            
            # 1. 최근 경기 수집
            matches = await self.ingest_recent_matches(
                competition=competitions[0],
                days_back=7,
                limit=50
            )
            result["matches"] = await self.embed_documents(matches)
            
            # 2. 순위표 수집
            standings = await self.ingest_standings(competitions)
            result["standings"] = await self.embed_documents(standings)
            
            # 3. 팀 정보 수집
            teams = await self.ingest_teams(competitions[0])
            result["teams"] = await self.embed_documents(teams)
            
            total = len(result["matches"]) + len(result["standings"]) + len(result["teams"])
            logger.info(f"✅ 전체 파이프라인 완료 (총 {total}개 문서)")
            
            return result
        
        except Exception as e:
            logger.error(f"❌ 전체 파이프라인 실패: {e}")
            return {"matches": [], "standings": [], "teams": []}