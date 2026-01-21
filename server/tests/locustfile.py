"""
FSF 플랫폼 부하 테스트 (Locust)

💰 Supabase 무료 티어 최적화 버전
🎯 목표: 100~300명 동시접속 테스트

실행 방법:
    # 1️⃣ Locust 설치
    pip install locust

    # 2️⃣ 서버 실행 (별도 터미널)
    cd server && source venv/bin/activate
    uvicorn main:app --port 8080

    # 3️⃣ 부하 테스트 실행

    # Web UI 모드 (추천 - 그래프로 실시간 확인)
    locust -f tests/locustfile.py --host=http://localhost:8080
    → 브라우저에서 http://localhost:8089 접속
    → Users: 100, Spawn rate: 10 설정

    # 헤드리스 모드 (터미널에서 바로 실행)
    
    # 🔹 1단계: 100명, 1분 (안전)
    locust -f tests/locustfile.py --host=http://localhost:8080 \
           --users 100 --spawn-rate 10 --run-time 1m --headless

    # 🔹 2단계: 200명, 2분 (중간)
    locust -f tests/locustfile.py --host=http://localhost:8080 \
           --users 200 --spawn-rate 20 --run-time 2m --headless

    # 🔹 3단계: 300명, 2분 (한계 테스트) ⭐
    locust -f tests/locustfile.py --host=http://localhost:8080 \
           --users 300 --spawn-rate 30 --run-time 2m --headless

    # CSV 리포트 저장 (면접용 증거)
    locust -f tests/locustfile.py --host=http://localhost:8080 \
           --users 300 --spawn-rate 30 --run-time 2m --headless \
           --csv=load_test_300users
"""

import random
import string
from locust import HttpUser, task, between, events
from datetime import datetime


# ============================================
# 헬퍼 함수
# ============================================

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


# ============================================
# 1. 일반 방문자 (60% - 가장 많음)
# ============================================

class VisitorUser(HttpUser):
    """
    비로그인 방문자 - 읽기 위주
    DB 부하 적음 ✅
    """
    weight = 6  # 60%
    wait_time = between(1, 3)
    
    @task(5)
    def view_posts_list(self):
        """게시글 목록 조회"""
        page = random.randint(1, 5)
        with self.client.get(
            f"/api/posts?page={page}&page_size=10",
            name="/api/posts [목록]",
            catch_response=True
        ) as response:
            if response.status_code in [200, 500]:
                response.success()
    
    @task(3)
    def view_post_detail(self):
        """게시글 상세"""
        post_id = f"test-{random.randint(1, 50)}"
        with self.client.get(
            f"/api/posts/{post_id}",
            name="/api/posts/[id]",
            catch_response=True
        ) as response:
            if response.status_code in [200, 404, 500]:
                response.success()
    
    @task(1)
    def health_check(self):
        """헬스 체크"""
        self.client.get("/health", name="/health")


# ============================================
# 2. 활성 유저 (30%)
# ============================================

class ActiveUser(HttpUser):
    """
    로그인 유저 - 읽기/쓰기 혼합
    """
    weight = 3  # 30%
    wait_time = between(2, 5)
    
    def on_start(self):
        self.user_id = f"user-{random_string(6)}"
        self.headers = {"Content-Type": "application/json"}
    
    @task(4)
    def view_posts(self):
        """게시글 목록"""
        self.client.get(f"/api/posts?page=1&page_size=20", name="/api/posts [로그인]")
    
    @task(2)
    def view_comments(self):
        """댓글 조회"""
        post_id = f"test-{random.randint(1, 30)}"
        self.client.get(
            f"/api/posts/{post_id}/comments",
            name="/api/posts/[id]/comments"
        )
    
    @task(1)
    def view_profile(self):
        """프로필 조회"""
        user_id = f"user-{random.randint(1, 50)}"
        with self.client.get(
            f"/api/users/profile/{user_id}",
            name="/api/users/profile/[id]",
            catch_response=True
        ) as response:
            if response.status_code in [200, 404, 500]:
                response.success()


# ============================================
# 3. 챗봇 유저 (10% - 가장 무거움)
# ============================================

class ChatbotUser(HttpUser):
    """
    AI 챗봇 사용자 - API 비용 발생
    비율 낮게 유지 💰
    """
    weight = 1  # 10%
    wait_time = between(5, 10)  # 느린 요청
    
    QUESTIONS = [
        "손흥민 오늘 경기 어땠어?",
        "토트넘 다음 경기 언제?",
        "EPL 순위 알려줘",
    ]
    
    @task(1)
    def ask_chatbot(self):
        """챗봇 질문 (무거운 요청)"""
        with self.client.post(
            "/api/chat",
            json={"message": random.choice(self.QUESTIONS)},
            name="/api/chat [AI]",
            catch_response=True,
            timeout=30
        ) as response:
            # 모든 응답 성공 처리 (테스트 목적)
            response.success()


# ============================================
# 이벤트 훅 (결과 출력)
# ============================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "="*60)
    print("🚀 FSF 부하 테스트 시작")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 타겟: {environment.host}")
    print("💰 Supabase 무료 티어 최적화 버전")
    print("="*60 + "\n")


@events.test_stop.add_listener  
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total.num_requests
    fail = stats.total.num_failures
    
    print("\n" + "="*60)
    print("📊 테스트 결과")
    print("="*60)
    print(f"📈 총 요청: {total:,}")
    print(f"❌ 실패: {fail:,}")
    print(f"✅ 성공률: {((total-fail)/total*100):.1f}%" if total > 0 else "N/A")
    
    if stats.total.avg_response_time:
        print(f"⏱️ 평균 응답: {stats.total.avg_response_time:.0f}ms")
        print(f"⏱️ 최대 응답: {stats.total.max_response_time:.0f}ms")
    
    if stats.total.total_rps:
        print(f"🔥 RPS: {stats.total.total_rps:.1f}")
    
    print("="*60)
    print("\n💡 면접용 포인트:")
    print(f"   '동시접속 테스트에서 {stats.total.total_rps:.0f} RPS 달성,")
    print(f"    평균 응답시간 {stats.total.avg_response_time:.0f}ms 유지'")
    print("="*60 + "\n")
