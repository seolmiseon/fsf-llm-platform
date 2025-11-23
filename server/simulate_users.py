"""
Amplitude 대시보드용 더미 데이터 생성 스크립트
- 20명의 가짜 사용자 시뮬레이션
- 100-200개 질문 자동 생성
- 24시간 분산 트래킹
"""

import requests
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict
import json

# ========== 설정 ==========
BACKEND_URL = "http://localhost:8080"  # 로컬 테스트용
# BACKEND_URL = "https://fsf-server-303660711261.asia-northeast3.run.app"  # 프로덕션용

# 더미 사용자 ID 풀
USER_IDS = [f"user_{i:03d}" for i in range(1, 21)]  # user_001 ~ user_020

# 축구 관련 질문 템플릿 (ChromaDB에 저장된 데이터 기반)
QUESTIONS = [
    # ===== 선수 통계 (40% - ChromaDB 저장 데이터) =====
    "손흥민 득점 몇 개야?",
    "손흥민 최근 폼 어때?",
    "손흥민 어시스트는?",
    "이강인 어시스트 몇 개?",
    "이강인 폼 좋아?",
    "이강인 소속팀 어디야?",
    "홀란드 득점왕이야?",
    "홀란드 몇 골 넣었어?",
    "살라 부상 상태는?",
    "살라 복귀 언제야?",
    "음바페 레알 이적 후 어때?",
    "음바페 적응 잘 했어?",
    "케인 바이에른에서 잘해?",
    "케인 득점 기록은?",
    "벨링엄 득점 능력은?",
    "벨링엄 몇 골 넣었어?",
    "더브라위너 부상이야?",
    "더브라위너 어시스트는?",
    "네이마르 복귀했어?",
    "네이마르 부상 어때?",
    "비니시우스 폼 어때?",
    "비니시우스 드리블 좋아?",
    # ===== 팀 정보 (20% - ChromaDB 저장 데이터) =====
    "맨시티 감독 누구야?",
    "맨시티 홈구장 어디야?",
    "토트넘 감독은?",
    "토트넘 홈구장 어디야?",
    "리버풀 감독 누구야?",
    "리버풀 별명 뭐야?",
    "레알 마드리드 감독은?",
    "레알 홈구장 어디야?",
    "바르셀로나 감독 누구야?",
    "파리 생제르맹 감독은?",
    # ===== 리그/경기 정보 (20% - API 데이터 예상) =====
    "프리미어리그 순위 알려줘",
    "맨시티 몇 위야?",
    "토트넘 순위는?",
    "리버풀 최근 경기 결과",
    "다음 경기 일정 알려줘",
    "이번 주 경기 있어?",
    "맨유 vs 첼시 결과는?",
    # ===== 일반 대화 (20% - 캐시 히트 테스트) =====
    "안녕",
    "안녕하세요",
    "고마워",
    "감사합니다",
    "잘 모르겠어",
    "다시 설명해줘",
    "도움 됐어",
    "좋은 정보네",
    "더 알려줘",
    "잘했어",
]

# 질문 타입 가중치
QUESTION_WEIGHTS = {
    "player_stats": 0.4,  # 40% - 선수 통계
    "team_info": 0.2,  # 20% - 팀 정보
    "league_info": 0.2,  # 20% - 리그/경기
    "general_chat": 0.2,  # 20% - 일반 대화
}

# 캐시 히트 타겟: 70%
CACHE_HIT_RATE = 0.7


def get_question_type(question: str) -> str:
    """질문에서 타입 추론"""
    if any(
        word in question
        for word in ["득점", "어시스트", "폼", "부상", "복귀", "골", "도움"]
    ):
        return "player_stats"
    elif any(word in question for word in ["감독", "홈구장", "별명", "창단"]):
        return "team_info"
    elif any(word in question for word in ["순위", "경기", "일정", "결과", "vs"]):
        return "league_info"
    else:
        return "general_chat"


def simulate_llm_request(question: str, user_id: str, timestamp: datetime) -> Dict:
    """
    LLM 요청 시뮬레이션

    Returns:
        {
            "success": bool,
            "cache_hit": bool,
            "response_time_ms": int,
            "question_type": str
        }
    """
    try:
        # 실제 백엔드 API 호출
        response = requests.post(
            f"{BACKEND_URL}/api/llm/chat",
            json={"query": question, "top_k": 5},
            timeout=30,
        )

        if response.status_code == 200:
            data = response.json()

            # 캐시 히트 여부는 응답 시간으로 추정
            # 500ms 이하 = 캐시 히트로 간주
            response_time = data.get("response_time_ms", 1000)
            cache_hit = response_time < 500

            return {
                "success": True,
                "cache_hit": cache_hit,
                "response_time_ms": response_time,
                "question_type": get_question_type(question),
            }
        else:
            return {
                "success": False,
                "cache_hit": False,
                "response_time_ms": 0,
                "question_type": get_question_type(question),
            }

    except Exception as e:
        print(f"❌ API 호출 실패: {e}")
        return {
            "success": False,
            "cache_hit": False,
            "response_time_ms": 0,
            "question_type": get_question_type(question),
        }


def generate_timeline_events(num_events: int = 150, hours: int = 24) -> List[Dict]:
    """
    24시간 동안 분산된 이벤트 생성

    Args:
        num_events: 생성할 이벤트 수 (100-200)
        hours: 시간 범위 (24시간)

    Returns:
        타임스탬프 정렬된 이벤트 리스트
    """
    events = []
    now = datetime.now()

    # 시간대별 가중치 (한국 시간대 고려)
    # 10-12시: 점심 트래픽
    # 18-23시: 저녁 트래픽
    hourly_weights = {
        0: 0.3,
        1: 0.2,
        2: 0.1,
        3: 0.1,
        4: 0.1,
        5: 0.2,
        6: 0.5,
        7: 0.8,
        8: 1.0,
        9: 1.2,
        10: 1.5,
        11: 1.8,
        12: 1.5,
        13: 1.2,
        14: 1.0,
        15: 0.8,
        16: 0.9,
        17: 1.2,
        18: 2.0,
        19: 2.5,
        20: 2.8,
        21: 2.5,
        22: 2.0,
        23: 1.0,
    }

    # 인기 질문 (캐시 히트용)
    popular_questions = QUESTIONS[: int(len(QUESTIONS) * 0.3)]  # 상위 30%

    for _ in range(num_events):
        # 가중치 기반 시간 선택
        hour = random.choices(
            list(hourly_weights.keys()), weights=list(hourly_weights.values())
        )[0]

        # 타임스탬프 생성 (과거 24시간 내)
        timestamp = now - timedelta(
            hours=23 - hour,
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )

        # 사용자 및 질문 선택
        user_id = random.choice(USER_IDS)

        # 70% 캐시 히트를 위해 인기 질문 반복
        if random.random() < CACHE_HIT_RATE:
            # 인기 질문 (상위 30% 중 선택)
            question = random.choice(popular_questions)
        else:
            # 새로운 질문
            question = random.choice(QUESTIONS)

        events.append(
            {"timestamp": timestamp, "user_id": user_id, "question": question}
        )

    # 타임스탬프 기준 정렬
    events.sort(key=lambda x: x["timestamp"])
    return events


def run_simulation(num_events: int = 150, dry_run: bool = False):
    """
    시뮬레이션 실행

    Args:
        num_events: 생성할 이벤트 수
        dry_run: True면 API 호출 없이 로그만 출력
    """
    print("=" * 60)
    print("🎯 Amplitude 더미 데이터 생성 시뮬레이션")
    print("=" * 60)
    print(f"📊 설정:")
    print(f"  - 이벤트 수: {num_events}개")
    print(f"  - 사용자 수: {len(USER_IDS)}명")
    print(f"  - 캐시 히트 목표: {CACHE_HIT_RATE*100}%")
    print(f"  - Dry Run: {dry_run}")
    print(f"  - Backend URL: {BACKEND_URL}")
    print("=" * 60)

    # 이벤트 생성
    events = generate_timeline_events(num_events)

    # 통계
    stats = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "cache_hit": 0,
        "total_response_time": 0,
        "question_types": {},
    }

    print(f"\n⏰ {len(events)}개 이벤트 시뮬레이션 시작...\n")

    for i, event in enumerate(events, 1):
        timestamp = event["timestamp"]
        user_id = event["user_id"]
        question = event["question"]

        print(
            f"[{i}/{len(events)}] {timestamp.strftime('%H:%M:%S')} | {user_id} | {question[:30]}..."
        )

        if not dry_run:
            # 실제 API 호출
            result = simulate_llm_request(question, user_id, timestamp)

            # 통계 업데이트
            stats["total"] += 1
            if result["success"]:
                stats["success"] += 1
                stats["total_response_time"] += result["response_time_ms"]
                if result["cache_hit"]:
                    stats["cache_hit"] += 1
            else:
                stats["failed"] += 1

            # 질문 타입 카운트
            q_type = result["question_type"]
            stats["question_types"][q_type] = stats["question_types"].get(q_type, 0) + 1

            # API 부하 방지 (0.5초 대기)
            time.sleep(0.5)
        else:
            # Dry run - API 호출 없이 시뮬레이션
            stats["total"] += 1
            stats["success"] += 1
            q_type = get_question_type(question)
            stats["question_types"][q_type] = stats["question_types"].get(q_type, 0) + 1

            # 랜덤 캐시 히트 시뮬레이션
            if random.random() < CACHE_HIT_RATE:
                stats["cache_hit"] += 1
                stats["total_response_time"] += random.randint(200, 400)
            else:
                stats["total_response_time"] += random.randint(800, 1500)

    # 결과 출력
    print("\n" + "=" * 60)
    print("📈 시뮬레이션 결과")
    print("=" * 60)
    print(
        f"✅ 성공: {stats['success']}/{stats['total']} ({stats['success']/stats['total']*100:.1f}%)"
    )
    print(
        f"❌ 실패: {stats['failed']}/{stats['total']} ({stats['failed']/stats['total']*100:.1f}%)"
    )

    if stats["success"] > 0:
        cache_hit_rate = stats["cache_hit"] / stats["success"] * 100
        avg_response_time = stats["total_response_time"] / stats["success"]

        print(
            f"💰 캐시 히트율: {stats['cache_hit']}/{stats['success']} ({cache_hit_rate:.1f}%)"
        )
        print(f"⚡ 평균 응답시간: {avg_response_time:.0f}ms")

        print(f"\n📊 질문 타입 분포:")
        for q_type, count in sorted(
            stats["question_types"].items(), key=lambda x: x[1], reverse=True
        ):
            percentage = count / stats["total"] * 100
            print(f"  - {q_type}: {count}개 ({percentage:.1f}%)")

    print("=" * 60)
    print("✨ 시뮬레이션 완료!")
    print("🔗 Amplitude 대시보드: https://analytics.amplitude.com")
    print("=" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Amplitude 더미 데이터 생성")
    parser.add_argument(
        "--events", type=int, default=150, help="생성할 이벤트 수 (기본: 150)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="API 호출 없이 시뮬레이션만"
    )
    parser.add_argument("--prod", action="store_true", help="프로덕션 서버 사용")

    args = parser.parse_args()

    # 프로덕션 모드면 URL 변경
    if args.prod:
        BACKEND_URL = "https://fsf-server-303660711261.asia-northeast3.run.app"

    run_simulation(num_events=args.events, dry_run=args.dry_run)
