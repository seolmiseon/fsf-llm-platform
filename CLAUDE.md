# FSF 백엔드 엔지니어링 표준 및 아키텍처 (CLAUDE.md)

## 1. 비동기 최적화 (Async Optimization)
FSF 플랫폼은 실시간 축구 데이터 처리와 AI 응답 지연을 최소화하기 위해 전면적인 비동기(Async) 아키텍처를 채택했습니다. 
- **FastAPI 비동기 처리**: `server/main.py`의 `async def root()`, `server/backend/routers` 및 `server/llm_service/routers/chat.py` 등 약 40개 엔드포인트는 모두 `async def` 기반으로 작성되어, I/O 바운드 작업 시 서버 스레드 블로킹을 방지합니다.
- **데이터베이스 연동**: `server/llm_service/services/firebase_cache.py` (Firestore) 및 `server/llm_service/services/chroma_service.py` (Vector DB)를 통해 데이터의 병렬 처리를 극대화합니다.
  - `await cache.get()` 및 `await chroma.query()` 등을 통해 데이터 조회 병목을 해결했습니다.

## 2. 데이터 무결성 (Data Integrity & Business Guardrails)
사용자 생성 콘텐츠(커뮤니티)와 외부 API(Football-Data, ESPN) 데이터의 정합성을 보장하기 위해 Pydantic 모델을 적극 활용합니다.
- **스키마 검증**: `server/backend/models.py` 및 `server/llm_service/models.py`에 정의된 Pydantic BaseModel을 통해 통계, 경기 일정, 선수 비교 파라미터를 강력하게 타이핑(Strong Typing)합니다.
- **비즈니스 가드레일 (콘텐츠 필터링)**: 게시글(Post) 및 댓글(Comment) 작성 시 정규식 + LLM 기반 필터링 모델을 거쳐 유해 콘텐츠를 사전에 차단하며, 응답 시 마스킹 처리를 수행하여 안전한 데이터만 유통시킵니다.

## 3. 비용 절감 아키텍처 (Cost-Saving Architecture: "이중 노드 로직")
FSF 플랫폼의 가장 핵심적인 엔지니어링 성과로, 불필요한 LLM API 서버 호출과 중복 연산을 방지하는 **이중 노드(Double Node) 제어 및 캐싱 전략**을 적용했습니다.

### 3.1 하이브리드 질문 분류 (Double Node Routing)
모든 질의를 무거운 Agent로 보내지 않고, `server/llm_service/utils/question_classifier.py`의 `is_complex_question()` 로직을 통해 가벼운 로직과 무거운 로직으로 분기 처리합니다.
- **Node 1 (Fast & Cheap)**: `server/llm_service/routers/chat.py` 의 `chat()` 엔드포인트. 단순 질문 시 단일 LLM 호출로 라우팅합니다.
- **Node 2 (Heavy & Accurate)**: `server/llm_service/routers/agent.py` 의 `agent()` 엔드포인트. 복잡한 다중 의도나 선수 비교 질문의 경우 LangChain Agent로 라우팅하여 정확성을 보장합니다.

### 3.2 2단계(2-Tier) 캐싱 시스템
API 응답 속도를 350ms에서 50ms로 낮추고 API 비용을 40% 절감하는 구조입니다.
- **Layer 1 (Vector Cache)**: `server/llm_service/utils/question_classifier.py`의 `_search_similar_classified_question` 와 유사 데이터 조회를 통해 ChromaDB($0 비용)에 저장된 답변을 반환합니다.
- **Layer 2 (API Cache)**: `server/backend/firebase_config.py` 연동 하에 Firestore를 통해 외부 축구 API 응답 결과를 캐싱하여 중복된 네트워크 요청 원천 차단.
