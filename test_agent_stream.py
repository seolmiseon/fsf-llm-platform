#!/usr/bin/env python3
"""
Agent 스트리밍 엔드포인트 CLI 테스트
"""
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8081"

def test_agent_stream(query: str, user_id: str = None):
    """Agent 스트리밍 테스트"""
    print("=" * 60)
    print(f"🤖 Agent 스트리밍 테스트")
    print("=" * 60)
    print(f"질문: {query}")
    if user_id:
        print(f"사용자 ID: {user_id}")
    print("-" * 60)
    
    url = f"{BASE_URL}/api/llm/agent/stream"
    body = {"query": query}
    if user_id:
        body["user_id"] = user_id
    
    try:
        response = requests.post(
            url,
            json=body,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"❌ 오류: HTTP {response.status_code}")
            print(response.text)
            return
        
        print("\n📡 스트리밍 응답:\n")
        
        answer_content = ""
        tools_used = []
        chunk_count = 0
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])  # 'data: ' 제거
                        
                        if data.get('type') == 'status':
                            print(f"⏳ 상태: {data.get('message')}")
                        
                        elif data.get('type') == 'answer_start':
                            tools_used = data.get('tools_used', [])
                            print(f"\n✅ 답변 시작 (사용된 도구: {', '.join(tools_used)})")
                            print("-" * 60)
                            answer_content = ""
                            chunk_count = 0
                        
                        elif data.get('type') == 'answer_chunk':
                            chunk = data.get('content', '')
                            chunk_count += 1
                            answer_content += chunk
                            # 타이핑 효과처럼 출력 (청크 단위로 표시)
                            # 디버깅: 청크 번호와 내용 출력
                            if chunk_count <= 5:  # 처음 5개 청크만 디버깅 출력
                                print(f"[청크 {chunk_count}: '{chunk}']", end='', flush=True)
                            else:
                                print(chunk, end='', flush=True)
                            import time
                            time.sleep(0.02)  # 20ms 딜레이로 타이핑 효과
                        
                        elif data.get('type') == 'answer_complete':
                            print("\n" + "-" * 60)
                            print("✅ 답변 완료")
                        
                        elif data.get('type') == 'error':
                            print(f"\n❌ 오류: {data.get('message')}")
                            return
                        
                        elif data.get('type') == 'done':
                            print(f"\n✅ 스트리밍 완료")
                            print("=" * 60)
                            return
                    
                    except json.JSONDecodeError as e:
                        print(f"\n⚠️ JSON 파싱 오류: {e}")
                        print(f"원본 라인: {line_str}")
        
        print(f"\n\n📝 최종 답변:\n{answer_content}")
        print(f"🛠️ 사용된 도구: {', '.join(tools_used)}")
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 연결 실패: 서버가 실행 중인지 확인하세요 ({BASE_URL})")
        print("서버 실행: cd server && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8081 --reload")
    except requests.exceptions.Timeout:
        print("❌ 타임아웃: 응답이 60초를 초과했습니다")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python test_agent_stream.py <질문> [user_id]")
        print("\n예시:")
        print("  python test_agent_stream.py '오늘 토트넘 경기 일정 알려줘'")
        print("  python test_agent_stream.py '손흥민 vs 홀란드 비교해줘'")
        print("  python test_agent_stream.py '내가 좋아하는 팀 경기 일정' 'Vq2YFItYwYYOmZT0OzRl3WGvjRi2'")
        sys.exit(1)
    
    query = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    test_agent_stream(query, user_id)
