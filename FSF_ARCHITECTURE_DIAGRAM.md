# ⚽ FSF - AI 기반 축구 팬 통합 허브 플랫폼

> **축구 팬들의 '장'**: 정보, 소통, 그리고 연결을 한 곳에서

---

## 🎯 프로젝트 개요

**축구 팬들을 위한 원스톱 통합 허브 플랫폼**

AI 기반 축구 정보 제공, 팬 커뮤니티, 그리고 미래의 B2B 파트너 연결까지
축구를 사랑하는 모든 사람들이 모이는 **'장(場)'**을 만듭니다.

### 핵심 가치 제안
- 🤖 **AI 챗봇**: 축구 관련 모든 질문에 즉시 답변 (RAG + Agent)
- 💬 **팬 커뮤니티**: 자유로운 소통 공간 + AI 기반 콘텐츠 안전 시스템
- 📊 **실시간 정보**: 경기 일정, 선수 통계, 팀 분석
- 🔗 **확장 가능**: 동호회, 티켓 예매, 여행 서비스 연결 (미래)

---

## 🛠️ 기술 스택

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Zustand (상태 관리)
- TailwindCSS + Radix UI

**Backend**
- Python 3.11+
- FastAPI (RESTful API)
- LangChain + LangGraph (AI Agent)

**AI/ML**
- OpenAI GPT-4o-mini (LLM)
- text-embedding-3-small (임베딩)
- ChromaDB (벡터 DB + RAG)

**Infrastructure**
- Vercel (Frontend 배포)
- Firebase Auth (인증)
- Firestore (사용자/커뮤니티 데이터)
- ChromaDB (벡터 캐시 + RAG)

---

## 🎯 주요 기능

### 1. AI 챗봇 (하이브리드 질문 분류)
- 정규식 기반 빠른 판단 → LLM 폴백
- 단순 질문: RAG 검색 → 1회 LLM 호출
- 복잡 질문: Agent + Tool 자동 선택
- 2단계 캐싱으로 90% 비용 절감

### 2. 콘텐츠 안전 시스템
- 욕설/비방 실시간 필터링
- AI Agent 기반 신고 처리 (무분별한 신고 방지)
- 사용자 신뢰도 점수 관리

### 3. 팬 커뮤니티
- 자유 게시판 + 경기 토론
- 댓글/대댓글 시스템
- 신고 기능 (게시글/댓글/유저)

### 4. 실시간 축구 정보
- Football-Data API 연동
- 경기 일정 및 결과
- 선수 통계 비교

---

## 🏗️ 시스템 아키텍처

```mermaid
graph TB
    subgraph "Frontend"
        A[Next.js App<br>사용자 인터페이스]
        A1[AI 챗봇]
        A2[커뮤니티]
        A3[통계 페이지]
    end
    
    subgraph "Backend API"
        B[FastAPI Server]
        B1[Chat Router]
        B2[Agent Router]
        B3[Community Router]
        B4[Stats Router]
    end
    
    subgraph "LLM Services"
        C[질문 분류기<br>정규식 + LLM]
        D[RAG Service<br>벡터 검색]
        E[LangChain Agent<br>ReAct 프롬프트]
    end
    
    subgraph "Agent Tools"
        F1[RAG Search]
        F2[Match Analysis]
        F3[Player Compare]
        F4[Posts Search]
        F5[Fan Preference]
        F6[Calendar]
    end
    
    subgraph "Storage"
        G[ChromaDB<br>벡터 캐시 + RAG]
        H[Firestore<br>사용자/게시글]
        I[Firebase Auth<br>인증]
    end
    
    subgraph "External APIs"
        J[OpenAI API]
        K[Football-Data API]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A1 --> B1
    A1 --> B2
    A2 --> B3
    A3 --> B4
    
    B1 --> C
    B2 --> C
    C -->|단순| D
    C -->|복잡| E
    
    E --> F1
    E --> F2
    E --> F3
    E --> F4
    E --> F5
    E --> F6
    
    D --> G
    D --> J
    F1 --> G
    F2 --> K
    F3 --> K
    F4 --> H
    F5 --> H
    F6 --> K
    
    B3 --> H
    B3 --> I
```

---

## 🔄 질문 처리 워크플로우

```mermaid
graph LR
    A[사용자 질문] --> B{콘텐츠<br>필터링}
    B -->|유해| C[차단]
    B -->|정상| D{질문 분류}
    
    D -->|단순 질문| E[RAG 검색]
    D -->|복잡 질문| F[Agent 실행]
    
    E --> G{캐시 히트?}
    G -->|Yes| H[캐시 응답<br>비용 $0]
    G -->|No| I[LLM 호출<br>1회]
    
    F --> J[Tool 선택<br>LLM 1회]
    J --> K[Tool 실행]
    K --> L[답변 생성<br>LLM 1회]
    
    H --> M[응답]
    I --> M
    L --> M
```

---

## 🧠 Agent Tool 워크플로우

```mermaid
graph TD
    A[복잡 질문] --> B[Agent 시작<br>ReAct 프롬프트]
    
    B --> C{Tool 선택}
    
    C -->|일반 정보| D[RAG Search<br>ChromaDB]
    C -->|경기 분석| E[Match Analysis<br>Football API]
    C -->|선수 비교| F[Player Compare<br>Football API]
    C -->|커뮤니티| G[Posts Search<br>Firestore]
    C -->|개인화| H[Fan Preference<br>사용자 선호]
    C -->|일정| I[Calendar<br>경기 일정]
    
    D --> J[결과 확인]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K{추가 Tool<br>필요?}
    K -->|Yes| C
    K -->|No| L[최종 답변]
```

---

## 💾 캐싱 전략

```mermaid
graph TD
    A[질문 입력] --> B{실시간 정보<br>필수?}
    
    B -->|Yes| C[캐시 스킵<br>API 직접 호출]
    B -->|No| D[1단계: ChromaDB<br>벡터 캐시]
    
    D --> E{유사도 체크}
    E -->|0.9+| F[캐시 사용<br>비용 $0]
    E -->|0.7-0.9| G[Judge 노드<br>충분성 판단]
    E -->|0.7-| H[캐시 미스]
    
    G -->|YES| F
    G -->|NO| H
    
    H --> I[2단계: Firestore<br>API 응답 캐시]
    I --> J{캐시 존재?}
    J -->|Yes| K[Firestore 캐시<br>TTL 1시간]
    J -->|No| C
    
    C --> L[외부 API 호출]
    L --> M[캐시 저장]
    M --> N[응답]
    
    F --> N
    K --> N
```

---

## 📊 성과 지표

### 성능 최적화
| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 응답 속도 | 350ms | 50ms | **7배 향상** |
| 캐시 히트율 | - | 90% | - |
| API 비용 | 100% | 60% | **40% 절감** |
| 정답률 | 90-95% | 97.9% | **2-8% 향상** |

### 핵심 기술 성과
- ⚡ **정규식 기반 빠른 판단**: 비용 $0으로 단순 질문 분류
- 🎯 **2단계 캐싱**: ChromaDB + Firestore 조합
- 🧠 **Judge 노드**: 유사도 0.7-0.9 구간 하이브리드 최적화
- 🔧 **Agent Tool 6개**: 다양한 축구 정보 자동 수집

---

## 🚀 확장 계획

### Phase 1: 현재 (MVP)
- ✅ AI 챗봇 (RAG + Agent)
- ✅ 기본 커뮤니티
- ✅ 신고 시스템

### Phase 2: 커뮤니티 강화
- ⏳ 동호회/클럽 기능
- ⏳ 사용자 프로필 확장
- ⏳ 배지/신뢰도 시스템

### Phase 3: B2B 파트너십
- 📋 티켓 예매 연결
- 📋 여행사 연동
- 📋 축구용품 추천

---

## 🔗 관련 문서

- [📘 PROJECT_HANDBOOK.md](./PROJECT_HANDBOOK.md) - 개발 지침서
- [📊 BUSINESS_PLAN_2026.md](./BUSINESS_PLAN_2026.md) - 사업 계획서

---

<div align="center">

**Built with ❤️ for Football Fans**

*FSF - Football Service for Fans*

</div>
