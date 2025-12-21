"""
부적절 내용 감지 API 테스트 스크립트
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8080"

def test_content_safety():
    """부적절 내용 감지 테스트"""
    print("=" * 60)
    print("부적절 내용 감지 API 테스트")
    print("=" * 60)
    
    # 1. 먼저 회원가입 시도 (이미 있으면 무시)
    print("\n1. 테스트 계정 준비 중...")
    signup_data = {
        "email": "test@example.com",
        "password": "test123456",
        "username": "testuser"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
        if response.status_code == 201:
            print("✅ 테스트 계정 생성 완료")
        elif response.status_code == 409:
            print("ℹ️ 테스트 계정이 이미 존재합니다.")
        else:
            print(f"⚠️ 회원가입 응답: {response.status_code}")
    except Exception as e:
        print(f"⚠️ 회원가입 시도 중 오류 (무시 가능): {e}")
    
    # 2. 로그인해서 토큰 받기
    print("\n2. 로그인 중...")
    login_data = {
        "email": "test@example.com",
        "password": "test123456"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ 로그인 실패: {response.status_code}")
            print(f"   응답: {response.text[:200]}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ 로그인 성공")
    except Exception as e:
        print(f"❌ 로그인 오류: {e}")
        print("   서버가 실행 중인지 확인해주세요: uvicorn main:app --reload")
        return
    
    # 3. 정규식 기반 욕설 감지 테스트
    print("\n3. 정규식 기반 욕설 감지 테스트...")
    test_cases = [
        {
            "title": "테스트 게시글",
            "content": "이건 정상적인 내용입니다.",
            "expected": "safe"
        },
        {
            "title": "욕설 테스트",
            "content": "시발 이건 테스트입니다.",
            "expected": "blocked"
        },
        {
            "title": "스팸 테스트",
            "content": "중고판매합니다. 연락주세요. 카톡: 010-1234-5678",
            "expected": "blocked"
        },
        {
            "title": "축구 분석 테스트",
            "content": "Arsenal의 이번 시즌 전술 분석을 해보겠습니다. 4-3-3 포메이션을 사용하며...",
            "expected": "safe"
        },
        {
            "title": "질문 테스트",
            "content": "손흥민의 최근 폼이 어떤가요?",
            "expected": "safe"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n  테스트 {i}: {test_case['title']}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/posts",
                headers=headers,
                json={
                    "title": test_case["title"],
                    "content": test_case["content"],
                    "category": "general"
                }
            )
            
            if test_case["expected"] == "blocked":
                if response.status_code == 400:
                    error_data = response.json().get("detail", {})
                    if isinstance(error_data, dict):
                        print(f"    ✅ 차단됨 (예상대로)")
                        print(f"       카테고리: {error_data.get('category')}")
                        print(f"       이유: {error_data.get('reason')}")
                    else:
                        print(f"    ✅ 차단됨: {error_data}")
                else:
                    print(f"    ❌ 차단되지 않음 (상태코드: {response.status_code})")
                    print(f"       응답: {response.text[:200]}")
            else:
                if response.status_code == 201:
                    post_data = response.json()
                    print(f"    ✅ 게시글 생성 성공")
                    print(f"       카테고리: {post_data.get('category')}")
                    print(f"       ID: {post_data.get('post_id')}")
                else:
                    print(f"    ❌ 생성 실패 (상태코드: {response.status_code})")
                    print(f"       응답: {response.text[:200]}")
                    
        except Exception as e:
            print(f"    ❌ 오류: {e}")
    
    # 4. 카테고리 자동 분류 테스트
    print("\n4. 카테고리 자동 분류 테스트...")
    category_tests = [
        {
            "title": "Arsenal 전술 분석",
            "content": "Arsenal은 4-3-3 포메이션을 사용하며 공격적인 축구를 선보입니다.",
            "expected_category": "축구분석"
        },
        {
            "title": "손흥민 최근 폼은?",
            "content": "손흥민의 최근 경기에서 보여준 폼이 어떤가요?",
            "expected_category": "질문"
        },
        {
            "title": "오늘 경기 후기",
            "content": "오늘 토트넘 경기를 봤는데 정말 재미있었습니다.",
            "expected_category": "후기"
        }
    ]
    
    for i, test_case in enumerate(category_tests, 1):
        print(f"\n  테스트 {i}: {test_case['title']}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/posts",
                headers=headers,
                json={
                    "title": test_case["title"],
                    "content": test_case["content"],
                    "category": "general"  # general로 보내서 자동 분류 테스트
                }
            )
            
            if response.status_code == 201:
                post_data = response.json()
                category = post_data.get('category')
                print(f"    ✅ 게시글 생성 성공")
                print(f"       자동 분류된 카테고리: {category}")
                if category == test_case["expected_category"]:
                    print(f"       ✅ 예상 카테고리와 일치!")
                else:
                    print(f"       ⚠️ 예상: {test_case['expected_category']}, 실제: {category}")
            else:
                print(f"    ❌ 생성 실패 (상태코드: {response.status_code})")
                print(f"       응답: {response.text[:200]}")
                
        except Exception as e:
            print(f"    ❌ 오류: {e}")
    
    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)

if __name__ == "__main__":
    test_content_safety()

