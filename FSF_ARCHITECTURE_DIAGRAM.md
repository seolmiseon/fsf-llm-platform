# FSF 프로젝트 아키텍처 다이어그램

## 🎨 색상 변경 가이드 (Mermaid Live Editor 사용)

1. **Mermaid Live Editor 열기**: https://mermaid.live/
2. **다이어그램 코드 복사**: 아래 원하는 다이어그램의 코드 블록 전체 복사
3. **Live Editor에 붙여넣기**: 왼쪽 편집기에 붙여넣기
4. **색상 변경**: `style` 태그의 색상 코드 변경
   - 예: `style Frontend fill:#e1f5ff` → `style Frontend fill:#원하는색상코드`
   - 색상 코드 형식: `#RRGGBB` (예: `#ffffff` = 흰색, `#000000` = 검은색)
5. **PNG/SVG 다운로드**: 우측 상단 다운로드 버튼 클릭

### 출력용 색상 팔레트 (흰색 배경에 최적화)
- **Frontend (파란색 계열)**: `#64B5F6` → 출력 가능한 파란색
- **Backend (주황색 계열)**: `#FFB74D` → 출력 가능한 주황색
- **LLM Service (보라색 계열)**: `#BA68C8` → 출력 가능한 보라색
- **Tools (초록색 계열)**: `#81C784` → 출력 가능한 초록색
- **Cache (노란색 계열)**: `#FFD54F` → 출력 가능한 노란색
- **External (분홍색 계열)**: `#F06292` → 출력 가능한 분홍색

### 더 진한 색상이 필요하다면
- **Frontend**: `#2196F3` (진한 파란색)
- **Backend**: `#FF9800` (진한 주황색)
- **LLM Service**: `#9C27B0` (진한 보라색)
- **Tools**: `#4CAF50` (진한 초록색)
- **Cache**: `#FFC107` (진한 노란색)
- **External**: `#E91E63` (진한 분홍색)

---

## 1. 전체 시스템 아키텍처

```mermaid
graph LR
    subgraph Frontend[Frontend]
        UI[사용자 인터페이스]
        ChatBot[챗봇 컴포넌트]
        Stats[통계 페이지]
        Community[커뮤니티]
    end

    subgraph Backend[Backend]
        API[FastAPI Router]
        ChatRouter[api/llm/chat]
        AgentRouter[api/llm/agent]
        StatsRouter[api/stats]
        CommunityRouter[api/community]
    end

    subgraph LLMService[LLM Service]
        QuestionClassifier[질문 분류기]
        ContentSafety[콘텐츠 필터링]
        RAGService[RAG Service]
        OpenAIService[OpenAI Service]
        Agent[LangChain Agent]
    end

    subgraph ToolsGroup[Agent Tools]
        RAGTool[RAG Search Tool]
        MatchTool[Match Analysis Tool]
        PlayerTool[Player Compare Tool]
        PostsTool[Posts Search Tool]
        FanTool[Fan Preference Tool]
        CalendarTool[Calendar Tool]
    end

    subgraph CacheGroup[2단계 캐싱]
        ChromaDBCache[ChromaDB]
        FirestoreCache[Firestore]
        CacheJudge[Judge 노드]
    end

    subgraph External[External Services]
        Firebase[Firebase]
        FootballAPI[Football Data API]
        OpenAI[OpenAI API]
    end

    UI --> ChatBot
    ChatBot --> API
    Stats --> API
    Community --> API

    API --> ChatRouter
    API --> AgentRouter
    API --> StatsRouter
    API --> CommunityRouter

    ChatRouter --> ContentSafety
    ChatRouter --> QuestionClassifier
    AgentRouter --> ContentSafety
    AgentRouter --> QuestionClassifier

    QuestionClassifier -->|단순 질문| ChatRouter
    QuestionClassifier -->|복잡 질문| AgentRouter

    ChatRouter --> ChromaDBCache
    ChatRouter --> RAGService
    ChatRouter --> OpenAIService

    AgentRouter --> Agent
    Agent --> RAGTool
    Agent --> MatchTool
    Agent --> PlayerTool
    Agent --> PostsTool
    Agent --> FanTool
    Agent --> CalendarTool

    ChromaDBCache --> RAGService
    CacheJudge --> OpenAIService

    RAGTool --> RAGService
    MatchTool --> FootballAPI
    PlayerTool --> FootballAPI
    PostsTool --> Firebase
    FanTool --> Firebase
    CalendarTool --> FootballAPI

    RAGService --> ChromaDBCache
    OpenAIService --> OpenAI
    Firebase --> FirestoreCache

    style Frontend fill:#64B5F6
    style Backend fill:#FFB74D
    style LLMService fill:#BA68C8
    style ToolsGroup fill:#81C784
    style CacheGroup fill:#FFD54F
    style External fill:#F06292
```

## 2. 질문 처리 플로우 (단순 vs 복잡)

```mermaid
flowchart TD
    Start([사용자 질문 입력]) --> ContentCheck{콘텐츠<br/>필터링}
    ContentCheck -->|유해 콘텐츠| Block[차단 및 경고]
    ContentCheck -->|정상| QuestionType{질문 분류}

    QuestionType -->|정규식 기반<br/>빠른 판단| SimpleCheck{단순 질문?}
    QuestionType -->|애매한 경우| LLMCheck[LLM 호출<br/>질문 분류]
    LLMCheck --> SimpleCheck

    SimpleCheck -->|단순 질문| SimpleFlow[단순 질문 처리<br/>chat.py]
    SimpleCheck -->|복잡 질문| ComplexFlow[복잡 질문 처리<br/>agent.py]

    SimpleFlow --> RealtimeCheck{실시간 정보<br/>필수?}
    RealtimeCheck -->|Yes| SkipCache[캐시 스킵]
    RealtimeCheck -->|No| CacheLookup[ChromaDB 캐시<br/>조회 유사도 0.75+]

    CacheLookup --> CacheFound{캐시<br/>발견?}
    CacheFound -->|Yes| SimilarityCheck{유사도<br/>0.9+?}
    SimilarityCheck -->|Yes| UseCache[캐시 사용<br/>비용 $0]
    SimilarityCheck -->|No 0.7-0.9| Judge[Judge 노드<br/>캐시 충분성 판단]
    Judge -->|YES| UseCache
    Judge -->|NO/CALL_API| SkipCache

    CacheFound -->|No| SkipCache
    SkipCache --> RAGSearch[RAG 검색<br/>ChromaDB]
    RAGSearch --> LLMCall[OpenAI 호출<br/>LLM 1회]
    LLMCall --> SaveCache[캐시 저장<br/>ChromaDB]
    SaveCache --> Response[응답 반환]

    UseCache --> Response

    ComplexFlow --> AgentExec[Agent 실행<br/>ReAct 프롬프트]
    AgentExec --> ToolSelect[Tool 자동 선택<br/>LLM 1회]
    ToolSelect --> ToolExec[Tool 실행<br/>API 호출]
    ToolExec --> AnswerGen[답변 생성<br/>LLM 1회]
    AnswerGen --> Response

    Response --> End([사용자에게<br/>응답 전달])

    style SimpleFlow fill:#81C784
    style ComplexFlow fill:#FF8A65
    style UseCache fill:#FFD54F
    style Judge fill:#BA68C8
    style AgentExec fill:#64B5F6
```

## 3. 캐싱 전략 상세 플로우

```mermaid
flowchart TD
    Query[사용자 질문] --> Router{실시간 정보<br/>필수?}
    Router -->|Yes| ForceAPI[강제 API 호출<br/>캐시 스킵]
    Router -->|No| Step1[1단계: ChromaDB<br/>벡터 캐시 조회]

    Step1 --> Embed[질문 임베딩<br/>text-embedding-3-small]
    Embed --> VectorSearch[벡터 유사도 검색<br/>유사도 0.75+]
    VectorSearch --> Found{캐시<br/>발견?}

    Found -->|No| Miss[캐시 미스]
    Found -->|Yes| TTL{TTL<br/>체크}
    TTL -->|만료| Miss
    TTL -->|유효| Keyword[키워드 매칭<br/>점수 계산]

    Keyword --> KeywordCheck{키워드 점수<br/>0.5+?}
    KeywordCheck -->|No| Miss
    KeywordCheck -->|Yes| Similarity{유사도<br/>범위?}

    Similarity -->|0.9+| HighSim[높은 유사도<br/>Judge 스킵]
    Similarity -->|0.7-0.9| MidSim[중간 유사도<br/>Judge 호출]
    Similarity -->|0.7-| LowSim[낮은 유사도<br/>캐시 사용]

    HighSim --> UseCache1[캐시 사용<br/>비용 $0]
    LowSim --> UseCache1

    MidSim --> Judge[Judge 노드<br/>LLM 1회 호출]
    Judge --> JudgeResult{Judge<br/>결과}
    JudgeResult -->|YES| UseCache2[캐시 사용<br/>비용 $0]
    JudgeResult -->|NO/CALL_API| Miss

    Miss --> Step2[2단계: Firestore<br/>API 응답 캐시]
    Step2 --> FirestoreCheck{Firestore<br/>캐시 존재?}
    FirestoreCheck -->|Yes| UseFirestore[Firestore 캐시<br/>사용 TTL 1시간]
    FirestoreCheck -->|No| API[외부 API 호출<br/>Football Data API]
    API --> SaveFirestore[Firestore에<br/>캐시 저장]
    SaveFirestore --> RAG[RAG 검색]
    RAG --> LLM[OpenAI 호출]
    LLM --> SaveChroma[ChromaDB에<br/>캐시 저장]
    SaveChroma --> Response[응답 반환]

    UseCache1 --> Response
    UseCache2 --> Response
    UseFirestore --> Response
    ForceAPI --> API

    style Step1 fill:#FFD54F
    style Step2 fill:#64B5F6
    style Judge fill:#BA68C8
    style UseCache1 fill:#81C784
    style UseCache2 fill:#81C784
    style UseFirestore fill:#81C784
```

## 4. Agent Tool 선택 플로우

```mermaid
flowchart TD
    Start([복잡 질문 입력]) --> Agent[LangChain Agent<br/>ReAct 프롬프트]
    Agent --> Thought[Thought:<br/>상황 분석]
    Thought --> Action[Action:<br/>Tool 선택]

    Action --> ToolDecision{적절한<br/>Tool 선택}

    ToolDecision -->|일반 정보| RAGTool[RAG Search Tool<br/>ChromaDB 검색]
    ToolDecision -->|경기 분석| MatchTool[Match Analysis Tool<br/>경기 ID 필요]
    ToolDecision -->|선수 비교| PlayerTool[Player Compare Tool<br/>선수명 비교]
    ToolDecision -->|커뮤니티| PostsTool[Posts Search Tool<br/>게시글 검색]
    ToolDecision -->|개인화| FanTool[Fan Preference Tool<br/>user_id 필요]
    ToolDecision -->|일정 조회| CalendarTool[Calendar Tool<br/>날짜/팀 필터]

    RAGTool --> RAGResult[RAG 검색 결과]
    MatchTool --> MatchResult[경기 분석 결과]
    PlayerTool --> PlayerResult[선수 비교 결과]
    PostsTool --> PostsResult[게시글 검색 결과]
    FanTool --> FanResult[사용자 선호도]
    CalendarTool --> CalendarResult[경기 일정]

    RAGResult --> Observation[Observation:<br/>결과 확인]
    MatchResult --> Observation
    PlayerResult --> Observation
    PostsResult --> Observation
    FanResult --> Observation
    CalendarResult --> Observation

    Observation --> MoreTools{추가 Tool<br/>필요?}
    MoreTools -->|Yes| Action
    MoreTools -->|No| Answer[Answer:<br/>최종 답변 생성]

    Answer --> End([사용자에게<br/>응답 전달])

    style Agent fill:#64B5F6
    style Thought fill:#BA68C8
    style Action fill:#FFD54F
    style Observation fill:#81C784
    style Answer fill:#FF8A65
```

## 5. 데이터베이스 및 저장소 구조

```mermaid
erDiagram
    ChromaDB ||--o{ VectorCache : "벡터 임베딩 저장"
    ChromaDB ||--o{ RAGDocuments : "RAG 문서 저장"
    
    Firestore ||--o{ APICache : "API 응답 캐시"
    Firestore ||--o{ Users : "사용자 정보"
    Firestore ||--o{ Posts : "커뮤니티 게시글"
    Firestore ||--o{ Comments : "댓글"
    Firestore ||--o{ UserPreferences : "사용자 선호도"

    ChromaDB {
        string collection_name
        vector embeddings
        string documents
        json metadata
        datetime created_at
    }

    Firestore {
        string collection
        string document_id
        json data
        datetime created_at
        datetime updated_at
    }

    VectorCache {
        string query_hash
        string answer
        float similarity
        float confidence
        datetime created_at
    }

    RAGDocuments {
        string content
        vector embedding
        json metadata
    }

    APICache {
        string cache_key
        json response_data
        int ttl_seconds
        datetime expires_at
    }

    Users {
        string user_id
        string email
        string username
    }

    Posts {
        string post_id
        string author_id
        string title
        string content
        string category
        int likes
        int comment_count
    }

    UserPreferences {
        string user_id
        array favorite_teams
        array favorite_players
    }
```

## 6. 성능 최적화 전략

```mermaid
graph LR
    subgraph Optimization["⚡ 성능 최적화 전략"]
        A[정규식 기반<br/>빠른 판단<br/>비용 $0] --> B[질문 분류<br/>캐싱<br/>24시간 TTL]
        B --> C[2단계 캐싱<br/>ChromaDB + Firestore]
        C --> D[Judge 노드<br/>하이브리드 최적화]
        D --> E[하이브리드 질문 분류<br/>단순: 1회, 복잡: 2회]
    end

    subgraph Results["📊 성과"]
        F[응답 속도<br/>350ms → 50ms<br/>7배 향상]
        G[캐시 히트율<br/>90%]
        H[API 비용<br/>40% 절감]
        I[정답률<br/>90-95% → 97.9%]
    end

    A --> F
    B --> F
    C --> G
    D --> G
    E --> H
    E --> I

    style Optimization fill:#81C784
    style Results fill:#FFD54F
```

## 주요 구성요소 설명

### Frontend
- **Next.js 14 App Router**: 서버 사이드 렌더링 및 라우팅
- **TypeScript**: 타입 안정성
- **Zustand**: 상태 관리
- **TailwindCSS**: 스타일링

### Backend
- **FastAPI**: 고성능 비동기 API 서버
- **Python 3.11+**: 최신 Python 기능 활용

### LLM Service
- **질문 분류기**: 정규식 기반 빠른 판단 + LLM 폴백
- **RAG Service**: ChromaDB 기반 벡터 검색
- **OpenAI Service**: GPT-4o-mini 호출
- **Agent**: LangChain 기반 ReAct 프롬프트

### Agent Tools (6개)
1. **RAG Search Tool**: 일반 축구 정보 검색
2. **Match Analysis Tool**: 경기 분석
3. **Player Compare Tool**: 선수 비교
4. **Posts Search Tool**: 커뮤니티 게시글 검색
5. **Fan Preference Tool**: 사용자 선호도 기반 추천
6. **Calendar Tool**: 경기 일정 조회

### 캐싱 전략
- **1단계: ChromaDB 벡터 캐시**
  - 유사도 0.75 이상 캐시 후보
  - Judge 노드로 최종 판단 (유사도 0.7-0.9)
  - TTL: 7일
- **2단계: Firestore API 캐시**
  - 외부 API 응답 캐싱
  - TTL: 1시간

### 성능 지표
- **응답 속도**: 350ms → 50ms (7배 향상)
- **캐시 히트율**: 90%
- **API 비용 절감**: 40%
- **정답률**: 90-95% → 97.9%
