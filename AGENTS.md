# FSF 서비스 모듈 에이전틱 명세서 (AGENTS.md)

## 1. 모듈별 페르소나 (Service Module Personas - 6 Tools)
FSF의 LLM 서비스(채팅, 경기 분석, 선수 비교 등)는 모두 독립적인 '에이전트'로 간주되며, 이들은 LangChain 프레임워크 기반 6개의 툴(Tool)을 통해 데이터를 주고받으며 전체 워크플로우를 완성합니다.

- **RAG 검색(rag_search) Agent**: 가장 기본적이고 빠른 축구 정보 전문가. 실시간 뉴스, 경기 결과 등의 벡터 검색을 담당하여 최신 데이터를 반환합니다.
- **경기 분석(match_analysis) Agent**: 과거 경기 기록과 전적을 분석하는 전술 전략가. 팀의 전력이나 포메이션 데이터를 분석해 제공합니다.
- **선수 비교(player_compare) Agent**: ESPN 등 580명의 선수 데이터를 파싱하고 비교하는 능력치 벤치마커. 데이터(골, 어시스트, 폼)를 종합하여 비교표를 도출합니다.
- **커뮤니티 검색(posts_search) Agent**: 사용자 중심의 여론 분석가. 커뮤니티 내 이슈나 반응을 확인하여 여론과 관련된 질문에 답합니다.
- **사용자 선호도(fan_preference) Agent**: 개인화 맞춤형 도우미. 사용자의 선호 팀과 선수를 기억하고 다른 에이전트들의 결과를 개인 맞춤형으로 필터링합니다.
- **경기 일정(calendar) Agent**: 일정 마스터. 향후 경기 및 과거 주요 경기 일정을 조회 및 필터링하여 사용자에게 전달합니다.

## 2. 이중 노드(Double Node) 제어 흐름 (Control Flow)
비용 효율과 응답 속도의 밸런스를 잡기 위한 '에이전틱한 판단 지점' 설계입니다.

- **라우팅 에이전트 (Question Classifier)**: 
  - `server/llm_service/utils/question_classifier.py`의 `is_complex_question()` 로직이 초기 판단.
  - 정규식 및 단순 키워드를 사용한 1차 판단으로 97.9%의 정확도를 유지합니다.
  - 정규식으로 판별 불가한 경우만 LLM 분류 모델을 호출하여 오판을 방지합니다.
- **경량화 분기 (chat.py, 노드 1)**:
  - 단순 질문으로 판단되면 `server/llm_service/routers/chat.py`로 향해 RAG 검색 파이프라인(`rag_service.search()`)만 수행하고 단일 LLM을 호출해 응답을 즉각 제공합니다.
- **복합 처리 분기 (LangChain Agent, 노드 2)**:
  - 다중 의도나 외부 데이터를 결합해야 하는 질문은 `server/llm_service/routers/agent.py` 단으로 향하여 위 6개의 Tool을 동적으로 조합하여 LLM을 다회 호출(오토 리플렉션)하여 높은 퀄리티의 답변을 생성합니다.

