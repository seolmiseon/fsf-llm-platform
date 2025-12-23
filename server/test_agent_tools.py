"""
Agent Tools 테스트 스크립트
CalendarTool, FanPreferenceTool 테스트
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8080"

def test_agent_calendar():
    """CalendarTool 테스트"""
    print("=" * 60)
    print("CalendarTool 테스트")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "오늘 경기 일정",
            "query": "오늘 경기 일정 알려줘",
            "user_id": None
        },
        {
            "name": "내일 경기 일정",
            "query": "내일 경기 일정 알려줘",
            "user_id": None
        },
        {
            "name": "토트넘 경기 필터링",
            "query": "오늘 토트넘 경기 알려줘",
            "user_id": None
        },
        {
            "name": "주간 일정 요약",
            "query": "이번 주 프리미어리그 경기 일정",
            "user_id": None
        },
        {
            "name": "월간 일정 요약",
            "query": "이번 달 경기 일정",
            "user_id": None
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n[{i}] {test_case['name']}")
        print(f"   질문: {test_case['query']}")
        
        payload = {
            "query": test_case["query"],
            "user_id": test_case["user_id"]
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/llm/agent",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 성공")
                print(f"   답변: {result.get('answer', '')[:200]}...")
                print(f"   사용된 Tool: {result.get('tools_used', [])}")
            else:
                print(f"   ❌ 실패: {response.status_code}")
                print(f"   응답: {response.text[:200]}")
        except Exception as e:
            print(f"   ❌ 오류: {e}")
            print("   서버가 실행 중인지 확인해주세요: uvicorn main:app --reload")


def test_agent_with_user_id():
    """user_id 포함 Agent 테스트 (FanPreferenceTool, CalendarTool 개인화)"""
    print("\n" + "=" * 60)
    print("Agent 개인화 기능 테스트 (user_id 포함)")
    print("=" * 60)
    
    # 먼저 테스트 계정으로 로그인해서 user_id 얻기
    print("\n1. 테스트 계정 로그인 중...")
    login_data = {
        "email": "test@example.com",
        "password": "test123456"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ 로그인 실패: {response.status_code}")
            print("   먼저 회원가입이 필요합니다.")
            return None
        
        token = response.json()["access_token"]
        print("✅ 로그인 성공")
        
        # user_id 얻기
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            user_id = user_data.get("uid")
            print(f"✅ 사용자 ID: {user_id}")
            return user_id
        else:
            print(f"❌ 사용자 정보 조회 실패: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 로그인 오류: {e}")
        print("   서버가 실행 중인지 확인해주세요")
        return None


def test_fan_preference():
    """FanPreferenceTool 테스트"""
    print("\n" + "=" * 60)
    print("FanPreferenceTool 테스트")
    print("=" * 60)
    
    user_id = test_agent_with_user_id()
    if not user_id:
        print("⚠️ user_id를 얻을 수 없어 FanPreferenceTool 테스트를 건너뜁니다.")
        return
    
    test_cases = [
        {
            "name": "내가 좋아하는 팀 경기",
            "query": "내가 좋아하는 팀 이번 주 경기 알려줘",
            "user_id": user_id
        },
        {
            "name": "내 팀 경기 일정",
            "query": "내 팀 오늘 경기 일정",
            "user_id": user_id
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n[{i}] {test_case['name']}")
        print(f"   질문: {test_case['query']}")
        
        payload = {
            "query": test_case["query"],
            "user_id": test_case["user_id"]
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/llm/agent",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 성공")
                print(f"   답변: {result.get('answer', '')[:300]}...")
                print(f"   사용된 Tool: {result.get('tools_used', [])}")
            else:
                print(f"   ❌ 실패: {response.status_code}")
                print(f"   응답: {response.text[:200]}")
        except Exception as e:
            print(f"   ❌ 오류: {e}")


def main():
    """메인 테스트 함수"""
    print("🤖 Agent Tools 통합 테스트")
    print("=" * 60)
    print(f"서버 URL: {BASE_URL}")
    print("=" * 60)
    
    # 1. CalendarTool 기본 테스트
    test_agent_calendar()
    
    # 2. FanPreferenceTool 테스트 (user_id 포함)
    test_fan_preference()
    
    print("\n" + "=" * 60)
    print("✅ 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()

