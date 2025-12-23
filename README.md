# ⚽ FSF (Full of Soccer Fun)

> AI 기반 축구 분석 플랫폼 - RAG + LLM으로 경기를 분석합니다

**Live Demo**: [https://fsfproject-fd2e6.web.app](https://fsfproject-fd2e6.web.app)  
**Backend**: [Cloud Run API](https://fsf-server-303660711261.asia-northeast3.run.app/docs)

![Next.js](https://img.shields.io/badge/Next.js_15-000000?logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

---

## 📖 소개

**FSF**는 축구 데이터와 LLM을 결합한 AI 분석 플랫폼입니다.  
RAG(검색 증강 생성) 기술로 실시간 경기 데이터를 분석하고, 사용자 질문에 정확하게 답변합니다.

### ✨ 주요 기능

- 🤖 **AI 챗봇**: 축구 관련 질문에 실시간 답변 (RAG 기반)
- 📊 **경기 분석**: AI가 경기 통계를 분석하고 인사이트 제공
- ⚖️ **선수 비교**: 데이터 기반 선수 능력치 비교 분석
- 📈 **통계 페이지**: 7개 리그 득점왕/어시스트왕 순위 (580명 선수 데이터)
- 📰 **커뮤니티**: 게시글, 댓글, 대댓글, 좋아요 기능 (실시간 알림)
- 🛡️ **콘텐츠 필터링**: 욕설/스팸/유해 내용 자동 감지 및 차단
- 🏷️ **카테고리 자동 분류**: LLM 기반 게시글 카테고리 자동 분류
- 🔐 **인증**: Firebase Authentication
- 📱 **반응형**: Mobile/Desktop 최적화

### 🏆 기술적 성과

```
⚡ 응답 속도 7배 향상     350ms → 50ms (2단계 캐싱)
💰 API 비용 40% 절감      $1/월 → $0.60/월
🎯 캐시 히트율 90%        유사 질문 중복 제거
📦 5개 LLM API 완성       챗봇, 경기분석, 선수비교
```

---

## 🏗 아키텍처

```
┌─────────────────┐
│  Frontend       │  Next.js 15 + TypeScript
│  (Firebase)     │  https://fsfproject-fd2e6.web.app
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│  Backend        │  FastAPI + Python 3.11
│  (Cloud Run)    │  37 API Endpoints
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌──────────────┐
│Firebase│ │  LLM Service │
│        │ │  ┌──────────┐│
│Firestore│ │  │ OpenAI  ││  GPT-4o-mini
│Auth    │ │  │ ChromaDB││  Vector Search
│Storage │ │  │ LangChain││  RAG Pipeline
└────────┘ │  └──────────┘│
           └──────┬───────┘
                  ↓
           ┌─────────────┐
           │ Football    │  실시간 경기 데이터
           │ Data API    │  팀/선수 통계
           └─────────────┘
```

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 + TypeScript
- **State**: Zustand
- **Styling**: TailwindCSS
- **Hosting**: Firebase Hosting
- **Auth**: Firebase Authentication

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database**: Firestore
- **Auth**: Firebase Admin SDK
- **Deploy**: Google Cloud Run

### LLM & AI
- **LLM**: OpenAI GPT-4o-mini (텍스트), Google Gemini 1.5 Flash (Vision)
- **RAG**: LangChain + ChromaDB
- **Embeddings**: text-embedding-3-small (1536-dim)
- **Cache**: 2-tier (ChromaDB → Firestore)
- **Content Safety**: 정규식 + LLM 기반 유해 콘텐츠 필터링
- **Category Classification**: LLM 기반 게시글 카테고리 자동 분류
- **Agent Tools**: 6개 Tool (RAG, 경기 분석, 선수 비교, 커뮤니티 검색, 사용자 선호도, 경기 일정)

### Data Sources
- **Football-Data.org API**: 실시간 경기/순위 (무료 티어)
- **ESPN Scraping**: 선수 통계 (580명, 7개 리그)
- **Firestore**: API 응답 캐싱 (1시간)
- **ChromaDB**: 벡터 검색 (유사도 90% 이상)

### DevOps
- **CI/CD**: GitHub Actions
- **Container**: Docker
- **Monitoring**: Cloud Run Logs

---

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/seolmiseon/fsf-llm-platform.git
cd fsf-llm-platform
```

### 2. 환경변수 설정

```bash
# server/.env 파일 생성
cd server
cp .env.example .env
```

`.env` 파일에 API 키 입력:
```bash
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=your-gemini-api-key  # Gemini Vision API (선택적, 이미지 분석용)
FOOTBALL_API_KEY=your-key
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### 3. Backend 실행

```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8080
```

**확인:**
- Swagger UI: http://localhost:8080/docs
- Health Check: http://localhost:8080/health

### 4. Frontend 실행

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

---

## 📡 API 엔드포인트

### Backend API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 현재 유저 정보 |
| GET/POST | `/api/posts` | 게시글 목록/작성 (콘텐츠 필터링 + 카테고리 자동 분류) |
| GET/PUT/DELETE | `/api/posts/{id}` | 게시글 상세/수정/삭제 |
| POST | `/api/posts/{id}/comments` | 댓글 작성 (콘텐츠 필터링) |
| GET | `/api/posts/{id}/comments` | 댓글 목록 (계층 구조) |
| PUT | `/api/posts/{id}/comments/{comment_id}` | 댓글 수정 (콘텐츠 필터링) |
| DELETE | `/api/posts/{id}/comments/{comment_id}` | 댓글 삭제 |
| POST | `/api/posts/{id}/comments/{comment_id}/like` | 댓글 좋아요 |
| GET | `/api/football/standings` | 리그 순위표 |
| GET | `/api/football/matches` | 경기 일정/결과 |
| GET | `/api/football/teams/{competition}` | 팀 정보 |

### LLM API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/llm/chat` | AI 챗봇 (RAG) |
| POST | `/api/llm/agent` | AI Agent (자동 Tool 선택) |
| POST | `/api/llm/match/{id}/analysis` | 경기 AI 분석 |
| POST | `/api/llm/match/{id}/predict` | 경기 예측 |
| POST | `/api/llm/player/compare` | 선수 비교 분석 |

### Stats API (NEW)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/stats/top-scorers` | 리그별 득점 순위 TOP N |
| GET | `/api/stats/top-assists` | 리그별 어시스트 순위 TOP N |
| GET | `/api/stats/leagues` | 사용 가능한 리그 목록 |
| GET | `/api/stats/player/{name}` | 선수 개인 통계 (ESPN 실시간) |

---

## 💡 핵심 기술 구현

### 2단계 캐싱 전략 (실제 구현)

```python
async def get_response(query: str):
    # 1️⃣ ChromaDB 벡터 캐시 (유사 질문 재사용)
    cached_answer = await chroma_cache.get_cached_answer(query)
    if cached_answer:
        return cached_answer  # 캐시 히트 (약 0.0029초, 비용 $0)
    
    # 2️⃣ Firestore 캐시 (외부 API 응답, 1시간 TTL)
    firestore_result = await firestore.get_api_cache(query)
    if firestore_result and not expired(firestore_result):
        return firestore_result  # 캐시 히트 (약 0.1초)
    
    # 3️⃣ RAG 검색 ($0) - 임베딩 기반 검색
    rag_results = await rag_service.search(query)
    
    # 4️⃣ OpenAI API (캐시 미스)
    response = await openai.chat(query, context=rag_results)
    
    # ChromaDB에 캐시 저장
    await chroma_cache.cache_answer(query, response)
    return response
```

**참고**: Memory 캐시는 구현되지 않음. ChromaDB + Firestore 2단계만 구현됨.

**성과:**
- 캐시 히트율: 90%
- 평균 응답 시간: 50ms (vs 350ms)
- API 비용: 40% 절감

### RAG 파이프라인

```python
# 1. 데이터 수집 & 벡터화
matches = fetch_recent_matches(limit=200)
for match in matches:
    text = f"{match.home} vs {match.away} {match.score}"
    embedding = openai.embed(text)
    chroma.add(text, embedding, metadata=match)

# 2. 질문 처리
query = "손흥민 최근 5경기 폼은?"
query_embedding = openai.embed(query)

# 3. 유사 문서 검색
results = chroma.query(query_embedding, top_k=5)

# 4. 컨텍스트 구성
context = "\n".join([r['text'] for r in results])

# 5. LLM 생성
prompt = f"참고:\n{context}\n\n질문: {query}"
answer = openai.chat(prompt, model="gpt-4o-mini")
```

---

## 📂 프로젝트 구조

```
fsf-llm-platform/
├── frontend/                    # Next.js 15
│   ├── src/
│   │   ├── app/                # App Router
│   │   ├── components/         # React 컴포넌트
│   │   └── stores/             # Zustand 스토어
│   └── public/                 # 정적 파일
│
├── server/                      # FastAPI
│   ├── main.py                 # 통합 앱 진입점
│   ├── backend/                # 일반 API
│   │   ├── routers/            # auth, posts, users, football
│   │   └── firebase_config.py  # Firebase Admin
│   │
│   ├── llm_service/            # LLM 전용
│   │   ├── routers/            # chat, match, player, stats
│   │   ├── services/           # openai, rag, cache
│   │   ├── scrapers/           # ESPN 웹 스크래핑 (하이브리드)
│   │   ├── prompts/            # 프롬프트 템플릿
│   │   ├── data/               # espn_player_ids.json (580명)
│   │   └── external_apis/      # Football-Data, YouTube
│   │
│   ├── portfolio-experiments/  # 실험/테스트 코드
│   └── data/
│       └── chroma_db/          # Vector Store
│
└── .github/workflows/
    └── deploy.yml              # CI/CD
```

---

## 🚢 배포

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Cloud Run)
```bash
# GitHub Actions 자동 배포
git push origin main

# 또는 수동 배포
cd server
gcloud run deploy fsf-server \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --env-vars-file env.yaml
```

---

## 💰 예상 비용 (월간)

| 서비스 | 사용량 | 비용 |
|--------|--------|------|
| OpenAI API (텍스트) | 챗봇 1,000건 + 분석 500건 | **$5-12** |
| Google Gemini (Vision) | 이미지 분석 50건 | **무료** (티어 내) 또는 $0.004 |
| Firebase | Firestore 읽기/쓰기 | 무료 (티어 내) |
| Cloud Run | 요청 10,000건/월 | 무료 (티어 내) |
| Football-Data API | 10 req/min | **무료** |
| **총 예상 비용** | | **$5-15/월** |

**최적화 전략:**
- ChromaDB 캐싱으로 API 호출 90% 감소
- GPT-4o-mini 사용 (GPT-4 대비 1/15 비용)
- Gemini 1.5 Flash 사용 (Vision, gpt-4-vision-preview 대비 1/133 비용)
- Firestore 1시간 캐싱으로 중복 요청 제거
- 하이브리드 방식: 단순 질문은 chat.py (1회 호출), 복잡한 질문만 Agent (2회 호출)

---

## 🔍 트러블슈팅

### Backend가 시작되지 않을 때
```bash
# 환경변수 확인
cat .env

# Firebase 키 확인
cat serviceAccountKey.json

# 포트 충돌 확인
lsof -i :8080
kill -9 <PID>
```

### ChromaDB 에러
```bash
# 데이터 디렉토리 권한
chmod -R 755 data/chroma_db

# 재생성
rm -rf data/chroma_db
python -m llm_service.services.data_ingestion
```

---

## 📝 라이선스

MIT License

---

## 👥 기여

이슈 및 PR 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Contact

**설미선**
- Email: budaxige@gmail.com
- GitHub: [@seolmiseon](https://github.com/seolmiseon)
- Portfolio: [함께키즈](https://togatherkids.web.app) | [FSF](https://fsfproject-fd2e6.web.app)

---

<div align="center">

**Made with ⚽ by seolmiseon**

[![Live Demo](https://img.shields.io/badge/Live_Demo-fsfproject.web.app-4285F4?style=for-the-badge&logo=firebase)](https://fsfproject-fd2e6.web.app)

</div>
