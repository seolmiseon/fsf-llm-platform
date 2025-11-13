# FSF (Full of Soccer Fun) - AI 축구 플랫폼

> Next.js 프론트엔드 + FastAPI 백엔드 + OpenAI LLM 통합 프로젝트

## 🏗 프로젝트 구조

```
fsf-llm-platform/
├── frontend/           # Next.js 15 + TypeScript
├── server/             # FastAPI + OpenAI + LangChain + ChromaDB
└── .github/workflows/  # CI/CD (GitHub Actions)
```

---

## ✅ 완료된 기능

### 📱 Frontend (Next.js)
- [x] 8개 주요 리그 선택 화면 (프리미어리그, 라리가, 분데스리가 등)
- [x] 실시간 경기 정보 (Live Matches)
- [x] 팀 순위 및 통계
- [x] 선수단 정보
- [x] 커뮤니티 게시판 (게시글, 댓글)
- [x] 인증 시스템 (Firebase Auth)
- [x] 반응형 디자인 (Mobile/Desktop)
- [x] Firebase Hosting 배포
- [x] CI/CD (GitHub Actions)
- [x] 이미지 최적화 (Next/Image)

### 🔐 Backend - 진행 중
- [x] 프로젝트 구조 설계 (모듈러 모노리스)
- [x] Football-Data API 연동 확인 ✅
- [x] Firebase Admin SDK 연동 ✅
- [x] 로컬 테스트 성공 ✅
- [ ] Cloud Run 배포
- [ ] 인증 API (JWT + Firebase Admin)
- [ ] 커뮤니티 API (게시글, 댓글 CRUD)
- [ ] Firestore CRUD 구현

### 🤖 LLM Service - 진행 중
- [x] OpenAI API 준비 (gpt-4o-mini)
- [x] Football-Data API 키 작동 확인 ✅
- [ ] ChromaDB RAG 시스템 구축
- [ ] 데이터 수집 파이프라인
- [ ] 챗봇 API
- [ ] 경기 분석 AI
- [ ] 선수 비교 분석

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 + TypeScript
- **Hosting**: Firebase Hosting
- **State**: Zustand
- **Styling**: TailwindCSS
- **Auth**: Firebase Authentication

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Auth**: Firebase Admin SDK
- **Database**: Firestore (NoSQL)

### LLM & AI
- **LLM**: OpenAI API (gpt-4o-mini)
- **RAG**: LangChain + ChromaDB
- **Vector DB**: ChromaDB (로컬/GCP)

### Data Sources
- **축구 데이터**: Football-Data.org API (무료 티어, 10 req/min)
- **영상**: YouTube Data API (하이라이트)
- **캐싱**: Firestore

### DevOps
- **CI/CD**: GitHub Actions
- **Container**: Docker (예정)
- **Branch**: main, develop, feature/*

---

## 📂 서버 디렉토리 구조

```
server/
├── main.py                          # FastAPI 통합 진입점
├── requirements.txt                 # Python 의존성
├── Dockerfile                       # 컨테이너 설정
├── .env                             # 환경변수 (gitignore)
├── serviceAccountKey.json           # Firebase 인증 (gitignore)
│
├── backend/                         # 일반 백엔드 API
│   ├── __init__.py
│   ├── firebase_config.py           # Firebase Admin 초기화
│   ├── models.py                    # Pydantic 모델
│   ├── dependencies.py              # 인증, DB 의존성
│   └── routers/
│       ├── __init__.py
│       ├── auth.py                  # 회원가입/로그인
│       ├── users.py                 # 유저 CRUD
│       ├── posts.py                 # 커뮤니티 게시글
│       └── football_data.py         # Football-Data API 프록시
│
├── llm_service/                     # LLM 전용 서비스
│   ├── __init__.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── chat.py                  # AI 챗봇 엔드포인트
│   │   ├── match_analysis.py        # 경기 분석
│   │   └── player_compare.py        # 선수 비교
│   │
│   ├── services/
│   │   ├── openai_service.py        # OpenAI 클라이언트
│   │   ├── rag_service.py           # ChromaDB RAG 시스템
│   │   └── data_ingestion.py        # 데이터 수집 → 벡터화
│   │
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── chat_prompts.py          # 챗봇 프롬프트
│   │   ├── match_prompts.py         # 경기 분석 프롬프트
│   │   └── player_prompts.py        # 선수 비교 프롬프트
│   │
│   └── external_apis/
│       ├── __init__.py
│       ├── football_data.py         # Football-Data API 클라이언트
│       └── youtube_api.py           # YouTube API 클라이언트
│
└── data/
    └── chroma_db/                   # ChromaDB 벡터 저장소 (gitignore)
```

---

## 🎯 개발 로드맵

### Phase 1: Backend 기본 인프라 (1주)
- [x] `server/main.py` FastAPI 통합 앱 생성
- [x] Firebase Admin SDK 연동
- [x] CORS 설정
- [x] 기본 라우터 구조 (`/health`, `/`)
- [x] Football-Data API 클라이언트 구현

### Phase 2: RAG 시스템 구축 (1-2주)
- [ ] ChromaDB 초기 설정
- [ ] 데이터 수집 스크립트
  - 최근 100-200 경기 결과
  - 팀 순위 데이터 (20팀 × 3리그)
  - 주요 선수 통계 (50-100명)
- [ ] 텍스트 벡터화 파이프라인
  - 경기: "맨시티 vs 첼시 3-1, 홀란드 2골..."
  - 선수: "손흥민, 토트넘, FW, 시즌 12골 5도움..."
- [ ] RAG 검색 테스트

### Phase 3: LLM 통합 (1주)
- [ ] OpenAI Service 구현
- [ ] 챗봇 API (`POST /api/llm/chat`)
  - 질문 → RAG 검색 → 컨텍스트 → GPT 답변
- [ ] 경기 분석 API (`POST /api/llm/match/{id}/analysis`)
- [ ] 선수 비교 API (`POST /api/llm/player/compare`)

### Phase 4: 프론트엔드 연동 (1주)
- [ ] Next.js에서 FastAPI 호출
- [ ] 채팅 UI 구현
- [ ] 경기 분석 버튼 추가
- [ ] 로딩/에러 처리

---

## 🤖 LLM 기능 상세

### 1. AI 챗봇 💬
```
사용자: "손흥민 최근 폼 어때?"
AI: [RAG로 최근 5경기 검색]
    "손흥민은 최근 5경기에서 3골 2도움을 기록하며 
     좋은 컨디션을 유지하고 있습니다..."
```

### 2. 경기 예측 & 분석 📊
```
사용자: [경기 상세 페이지에서 "AI 분석" 클릭]
AI: "맨시티 vs 첼시 분석:
     - 점유율: 맨시티 68% vs 첼시 32%
     - 슈팅: 18 vs 6
     - 홀란드 3골로 경기 주도
     - 첼시 수비 라인 취약점 노출"
```

### 3. 선수 비교 분석 ⚽
```
사용자: "홀란드 vs 케인 누가 더 나아?"
AI: [두 선수 통계 비교]
    "홀란드: 시즌 28골 5도움, 골 결정력 뛰어남
     케인: 시즌 22골 12도움, 플레이메이킹 우수
     → 순수 득점력은 홀란드, 팀 기여도는 케인이 높음"
```

---

## 💰 예상 비용 (월간)

```
OpenAI API (gpt-4o-mini):
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- 예상: 챗봇 1,000건 + 분석 500건 = $5-12/월

### 네이버 Clova Studio (HyperCLOVA X) - 대안
- Input: ₩200 / 1M tokens (~$0.15)
- Output: ₩800 / 1M tokens (~$0.60)
- 예상: 챗봇 1,000건 + 분석 500건 = **₩6,500-15,000/월** (~$5-12)

**비용은 비슷하나, 한국어 성능 우수 시 향후 전환 고려**

Firebase/Firestore:
- 무료 티어: 50,000 읽기/일, 20,000 쓰기/일
- 예상: 무료 범위 내

Football-Data API:
- 무료 티어: 10 requests/min
- 예상: 무료 범위 내

ChromaDB:
- 로컬/GCP 무료

→ 총 예상 비용: $5-15/월 (초기 단계)
```

---

## 🚀 빠른 시작

### 1. Frontend 실행
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### 2. Backend 실행

#### 로컬 개발 (Python)
```bash
cd server

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일 열어서 실제 API 키 입력

# 서버 실행
uvicorn main:app --reload --port 8080
```

**서버 확인:**
- Swagger UI: http://localhost:8080/docs
- Health Check: http://localhost:8080/health
- Debug Info: http://localhost:8080/debug

#### Docker 실행 (선택사항)
```bash
cd server

# 이미지 빌드
docker build -t fsf-server:local .

# 컨테이너 실행
docker run -p 8080:8080 --env-file .env fsf-server:local

# ChromaDB 데이터 영속성 (볼륨 마운트)
docker run -p 8080:8080 --env-file .env \
  -v $(pwd)/data:/app/data \
  fsf-server:local
```

**참고:**
- LLM 의존성이 무거우므로 개발 초기엔 필요 없는 라우터는 주석 처리 가능
- `FIREBASE_SERVICE_ACCOUNT_KEY`를 환경변수로 사용 시 JSON 이스케이프 주의

### 3. 환경변수 설정 (.env)

프로젝트 루트에 `.env.example` 파일이 있습니다. 복사 후 실제 값을 입력하세요.

```bash
# server/.env.example 파일 내용

# General
PORT=8080
ENV=development

# OpenAI
OPENAI_API_KEY=sk-proj-...                    # 필수
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json  # 파일 경로 방식
# FIREBASE_SERVICE_ACCOUNT_KEY={...}                    # 또는 JSON 문자열

# Football-Data API
FOOTBALL_DATA_API_KEY=your-football-data-key   # 필수

# YouTube API (선택사항)
YOUTUBE_API_KEY=your-youtube-key

# ChromaDB
CHROMA_PERSIST_DIR=./data/chroma_db

# Database (현재 미사용, Firestore만 사용)
DB_URL=

# Logging
LOG_LEVEL=info
```

**필수 발급:**
1. **OpenAI API Key**: https://platform.openai.com/api-keys
2. **Football-Data API Key**: https://www.football-data.org/client/register
3. **Firebase Service Account**: Firebase Console → 프로젝트 설정 → 서비스 계정

---

## 📊 API 엔드포인트 (계획)

### Backend API
```
POST   /api/auth/signup          # 회원가입
POST   /api/auth/login           # 로그인
GET    /api/auth/me              # 현재 유저 정보

GET    /api/posts                # 게시글 목록
POST   /api/posts                # 게시글 작성
GET    /api/posts/{id}           # 게시글 상세
PUT    /api/posts/{id}           # 게시글 수정
DELETE /api/posts/{id}           # 게시글 삭제

GET    /api/football/standings   # 순위표
GET    /api/football/matches     # 경기 일정/결과
GET    /api/football/teams/{id}  # 팀 정보
```

### LLM API
```
POST   /api/llm/chat                      # AI 챗봇
POST   /api/llm/match/{id}/analysis       # 경기 AI 분석
POST   /api/llm/match/{id}/predict        # 경기 예측
POST   /api/llm/player/compare            # 선수 비교
GET    /api/llm/player/{id}/insights      # 선수 AI 인사이트
```

---

## 🔧 데이터 파이프라인

```
Football-Data API
       ↓
  [API Client]
       ↓
   Firestore (캐싱)
       ↓
  [Data Ingestion]
       ↓
   ChromaDB (벡터화)
       ↓
  [RAG Service]
       ↓
  LangChain + OpenAI
       ↓
    AI 답변
```

### Firestore 스키마 (예시)
```
competitions/
  └── PL/
      ├── info: {name, emblem, season}
      └── standings: [{position, team, points...}]

teams/
  └── 57/  # Arsenal
      ├── info: {name, crest, founded}
      └── stats: {played, won, draw, lost...}

matches/
  └── {matchId}/
      ├── result: {homeTeam, awayTeam, score}
      └── stats: {possession, shots...}

players/
  └── {playerId}/
      └── stats: {goals, assists, rating}
```

### ChromaDB 컬렉션
```python
# 예시: Arsenal 벡터화
document = """
Arsenal FC (2024-25 Premier League)
Position: 1st place with 16 points
Record: 5 wins, 1 draw, 1 loss
Goals: 14 scored, 3 conceded (+11 GD)
Key Players: Saka (3 goals), Martinelli (2 goals)
"""

collection.add(
    documents=[document],
    metadatas=[{
        "team_id": 57,
        "team": "Arsenal",
        "competition": "PL",
        "season": "2024-25",
        "type": "standings"
    }],
    ids=["arsenal_pl_2025_standings"]
)
```

---

## 🔍 Known Issues

### Frontend
- [ ] 일부 모바일 반응형 개선 필요
- [x] 이미지 최적화 완료

### Backend
- [ ] 아직 구현 안 됨
- [ ] API Rate Limit 처리 필요
- [ ] 캐싱 전략 필요

### LLM
- [ ] 프롬프트 최적화 필요
- [ ] 토큰 사용량 모니터링 필요
- [ ] 한국어 답변 품질 테스트 필요

---

## 📈 성능 최적화 계획

1. **API 캐싱**
   - Firestore에 1시간 캐싱
   - 동일 요청 중복 방지

2. **RAG 최적화**
   - 벡터 검색 결과 Top-K 제한 (5-10개)
   - 메타데이터 필터링 활용

3. **토큰 절약**
   - 프롬프트 길이 최소화
   - 컨텍스트 압축 (요약)

4. **응답 속도**
   - 스트리밍 응답 (Server-Sent Events)
   - 병렬 처리 (async/await)

---

## 🧪 테스트 전략

### 1. Football-Data API 테스트
```bash
# 프리미어리그 순위
curl -H "X-Auth-Token: YOUR_KEY" \
  https://api.football-data.org/v4/competitions/PL/standings

# 최근 경기
curl -H "X-Auth-Token: YOUR_KEY" \
  https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED
```

### 2. RAG 시스템 테스트
```python
# 간단한 질문으로 검증
query = "토트넘 최근 5경기 결과"
results = rag_service.search(query, top_k=5)
# 예상: 토트넘 관련 경기 5개 반환
```

### 3. OpenAI 연동 테스트
```python
response = openai_service.chat(
    messages=[
        {"role": "system", "content": "축구 전문가"},
        {"role": "user", "content": "손흥민 최근 폼 어때?"}
    ],
    context=rag_results  # RAG에서 가져온 데이터
)
```

---

## 👥 협업 가이드

### Git Branch 전략
```
main           # 프로덕션 (자동 배포)
  └── develop  # 개발 브랜치
       └── feature/backend-setup
       └── feature/rag-implementation
       └── feature/llm-integration
```

### Commit 메시지
```
feat: FastAPI 통합 앱 구축
fix: Football-Data API 에러 핸들링
docs: README 업데이트
chore: requirements.txt 업데이트
```

### 코드 리뷰 체크리스트
- [ ] 환경변수 하드코딩 없음
- [ ] API 키 .gitignore 처리
- [ ] 에러 핸들링 구현
- [ ] 타입 힌트 (Python)
- [ ] Docstring 작성

---

## 📚 참고 자료

- [Football-Data API Docs](https://www.football-data.org/documentation/quickstart)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/use_cases/question_answering/)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---


---

**Last Updated**: 2025-01-15
**Version**: 0.1.0 (Backend 구축 시작 단계)