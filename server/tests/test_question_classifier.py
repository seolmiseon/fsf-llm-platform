"""
하이브리드 질문 분류 로직 테스트 스크립트

📖 실행 방법:
    cd ~/fsf-llm-platform/server
    python test_question_classifier.py

⚠️ 주의:
    - OpenAI API 키 필요 (.env 파일) - LLM fallback 테스트용
    - 서버 실행 불필요 (직접 함수 import)
"""
import asyncio
import sys
import os
from pathlib import Path
import time

# ============================================
# 환경 설정
# ============================================
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)

# .env 파일 로드
from dotenv import load_dotenv
load_dotenv(script_dir / ".env")

# 경로에 현재 디렉토리 추가
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

# ============================================
# 테스트 케이스 정의
# ============================================

# 단순 질문 샘플 (10-20개)
SIMPLE_QUESTIONS = [
    "손흥민 최근 폼은?",
    "토트넘은 어떤 팀인가요?",
    "프리미어리그 순위 알려줘",
    "맨체스터 유나이티드 정보",
    "오늘 경기 결과는?",
    "손흥민 득점 수",
    "라리가 우승팀은?",
    "홀란드 나이는?",
    "분데스리가 최고 득점자는?",
    "세리에A 리그 정보",
    "리그1 팀 목록",
    "챔피언스리그 결승전 날짜",
    "손흥민 소속 팀",
    "토트넘 홈구장 이름",
    "프리미어리그 시즌 시작일",
    "맨유 감독 이름",
    "아스널 전술",
    "첼시 최근 전적",
    "리버풀 팬 수",
    "맨시티 우승 횟수"
]

# 복잡 질문 샘플 (실제 소비자 질문 패턴 포함)
COMPLEX_QUESTIONS = [
    # 비교 질문
    "손흥민 vs 홀란드 비교해줘",
    "맨유 vs 토트넘 비교",
    "프리미어리그 vs 라리가 비교",
    "손흥민과 홀란드 누가 더 좋아요?",
    "토트넘 대 아스널 비교",
    
    # 여러 작업 요청 (실제 소비자 질문 패턴) ⭐
    "손흥민 정보 알려주고 최근 경기도 보여줘",
    "손흥민 정보 알려주고 통계도 보여줘",
    "토트넘 정보 알려주고 최근 경기 결과도 보여줘",
    "맨유 정보 알려주고 순위도 알려줘",
    "홀란드 정보 알려주고 득점도 보여줘",
    "경기 분석하고 영상도 보여줘",
    "선수 비교하고 통계도 알려줘",
    "경기 일정 알려주고 분석도 해줘",
    "손흥민 최근 경기 알려주고 분석도 해줘",
    "토트넘 경기 일정 알려주고 결과도 보여줘",
    "프리미어리그 순위 알려주고 분석도 해줘",
    "맨유 정보 알려주고 최근 전적도 보여줘",
    "아스널 정보 알려주고 다음 경기도 알려줘",
    
    # 특정 Tool 필요
    "오늘 경기 일정 알려줘",
    "이번 주 경기 스케줄",
    "내가 좋아하는 팀 경기 일정",
    "커뮤니티에서 손흥민 관련 글 찾아줘",
    "게시판에 토트넘 분석 글 있어?",
    
    # 복합 작업
    "손흥민 최근 경기 분석하고 비교도 해줘",
    "맨유 vs 토트넘 경기 분석하고 예측도 해줘",
    
    # 경기 ID 포함
    "경기 123456 분석해줘",
    "매치 987654 결과 알려줘"
]

# 축약형 질문 (vs 키워드 없음)
ABBREVIATED_QUESTIONS = [
    "맨유 토트넘",
    "손흥민 홀란드",
    "프리미어리그 라리가",
    "아스널 첼시 비교",
    "리버풀 맨시티"
]

# 애매한 질문 (LLM fallback 필요)
AMBIGUOUS_QUESTIONS = [
    "손흥민과 토트넘",
    "맨유 그리고 아스널",
    "프리미어리그 정보와 라리가 비교",
    "경기 일정과 분석",
    "선수 정보와 통계"
]

# 실제 소비자 질문 패턴 (추가 테스트용)
REAL_WORLD_QUESTIONS = [
    # "~알려주고 ~도 보여줘" 패턴
    "손흥민 정보 알려주고 최근 경기도 보여줘",
    "토트넘 정보 알려주고 다음 경기도 알려줘",
    "맨유 정보 알려주고 순위도 보여줘",
    "홀란드 정보 알려주고 득점 통계도 보여줘",
    "아스널 정보 알려주고 최근 전적도 보여줘",
    
    # "~하고 ~도" 패턴
    "손흥민 분석하고 통계도 알려줘",
    "경기 일정 알려주고 결과도 보여줘",
    "선수 비교하고 경기 일정도 알려줘",
    
    # "~해주고 ~도" 패턴
    "손흥민 정보 해주고 최근 경기도 보여줘",
    "토트넘 분석해주고 통계도 알려줘"
]


# ============================================
# 테스트 함수
# ============================================

async def test_regex_classification():
    """정규식 기반 분류 정확도 테스트"""
    print("=" * 60)
    print("1. 정규식 기반 분류 정확도 테스트")
    print("=" * 60)
    
    from llm_service.utils.question_classifier import is_complex_question
    
    # 단순 질문 테스트
    print("\n📝 단순 질문 테스트 (False 예상):")
    simple_correct = 0
    simple_total = len(SIMPLE_QUESTIONS)
    
    for i, question in enumerate(SIMPLE_QUESTIONS, 1):
        result = await is_complex_question(question, use_llm_fallback=False)
        status = "✅" if not result else "❌"
        print(f"  {i:2d}. {status} {question}")
        if not result:
            simple_correct += 1
    
    simple_accuracy = (simple_correct / simple_total) * 100
    print(f"\n  단순 질문 정확도: {simple_correct}/{simple_total} ({simple_accuracy:.1f}%)")
    
    # 복잡 질문 테스트
    print("\n📝 복잡 질문 테스트 (True 예상):")
    complex_correct = 0
    complex_total = len(COMPLEX_QUESTIONS)
    
    for i, question in enumerate(COMPLEX_QUESTIONS, 1):
        result = await is_complex_question(question, use_llm_fallback=False)
        status = "✅" if result else "❌"
        print(f"  {i:2d}. {status} {question}")
        if result:
            complex_correct += 1
    
    complex_accuracy = (complex_correct / complex_total) * 100
    print(f"\n  복잡 질문 정확도: {complex_correct}/{complex_total} ({complex_accuracy:.1f}%)")
    
    # 전체 정확도
    total_correct = simple_correct + complex_correct
    total_questions = simple_total + complex_total
    total_accuracy = (total_correct / total_questions) * 100
    
    print(f"\n📊 전체 정확도: {total_correct}/{total_questions} ({total_accuracy:.1f}%)")
    
    return {
        "simple_accuracy": simple_accuracy,
        "complex_accuracy": complex_accuracy,
        "total_accuracy": total_accuracy
    }


async def test_llm_fallback():
    """LLM fallback 동작 확인"""
    print("\n" + "=" * 60)
    print("2. LLM Fallback 동작 확인")
    print("=" * 60)
    
    from llm_service.utils.question_classifier import is_complex_question
    
    # OpenAI API 키 확인
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️ OPENAI_API_KEY가 설정되지 않았습니다.")
        print("   LLM fallback 테스트를 건너뜁니다.")
        print("   .env 파일에 OPENAI_API_KEY를 설정해주세요.")
        return None
    
    print("\n📝 애매한 질문 테스트 (LLM fallback 사용):")
    print("   (정규식으로 판단 불가능한 케이스)")
    
    fallback_results = []
    
    for i, question in enumerate(AMBIGUOUS_QUESTIONS, 1):
        print(f"\n  {i}. 질문: {question}")
        
        # 정규식만으로 판단 (fallback 없음)
        regex_result = await is_complex_question(question, use_llm_fallback=False)
        print(f"     정규식 결과: {'복잡' if regex_result else '단순'}")
        
        # LLM fallback 사용
        try:
            llm_result = await is_complex_question(question, use_llm_fallback=True)
            print(f"     LLM 결과: {'복잡' if llm_result else '단순'}")
            
            fallback_results.append({
                "question": question,
                "regex": regex_result,
                "llm": llm_result,
                "changed": regex_result != llm_result
            })
            
            if regex_result != llm_result:
                print(f"     ✅ LLM fallback이 결과를 변경했습니다!")
            else:
                print(f"     ℹ️ LLM fallback 결과가 정규식과 동일합니다.")
                
        except Exception as e:
            print(f"     ❌ LLM fallback 오류: {e}")
            fallback_results.append({
                "question": question,
                "regex": regex_result,
                "llm": None,
                "error": str(e)
            })
        
        # API 호출 간격 (rate limit 방지)
        await asyncio.sleep(1)
    
    # 결과 요약
    changed_count = sum(1 for r in fallback_results if r.get("changed", False))
    total_count = len([r for r in fallback_results if r.get("llm") is not None])
    
    print(f"\n📊 LLM Fallback 요약:")
    print(f"   총 질문: {len(AMBIGUOUS_QUESTIONS)}")
    print(f"   LLM 호출 성공: {total_count}")
    print(f"   결과 변경: {changed_count}")
    
    return {
        "total": len(AMBIGUOUS_QUESTIONS),
        "llm_success": total_count,
        "changed": changed_count
    }


async def test_cache_behavior():
    """캐시 동작 확인"""
    print("\n" + "=" * 60)
    print("3. 캐시 동작 확인")
    print("=" * 60)
    
    from llm_service.utils.question_classifier import is_complex_question, _question_classification_cache
    
    # 캐시 초기화
    _question_classification_cache.clear()
    
    test_questions = [
        "손흥민 최근 폼은?",
        "맨유 vs 토트넘 비교",
        "오늘 경기 일정"
    ]
    
    print("\n📝 캐시 테스트:")
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n  {i}. 질문: {question}")
        
        # 첫 번째 호출 (캐시 미스 예상)
        start_time = time.time()
        result1 = await is_complex_question(question, use_llm_fallback=False)
        time1 = time.time() - start_time
        print(f"     첫 호출: {'복잡' if result1 else '단순'} (소요 시간: {time1*1000:.2f}ms)")
        print(f"     캐시 상태: {len(_question_classification_cache)}개 항목")
        
        # 두 번째 호출 (캐시 히트 예상)
        start_time = time.time()
        result2 = await is_complex_question(question, use_llm_fallback=False)
        time2 = time.time() - start_time
        print(f"     두 번째 호출: {'복잡' if result2 else '단순'} (소요 시간: {time2*1000:.2f}ms)")
        
        # 결과 일치 확인
        if result1 == result2:
            print(f"     ✅ 결과 일치")
        else:
            print(f"     ❌ 결과 불일치!")
        
        # 캐시 히트 확인 (두 번째 호출이 더 빠른지)
        if time2 < time1:
            speedup = time1 / time2 if time2 > 0 else float('inf')
            print(f"     ✅ 캐시 히트 확인 (약 {speedup:.1f}배 빠름)")
        else:
            print(f"     ⚠️ 캐시 히트 효과 미미 (시간 차이: {abs(time1-time2)*1000:.2f}ms)")
    
    print(f"\n📊 최종 캐시 상태: {len(_question_classification_cache)}개 항목")
    
    return {
        "cache_size": len(_question_classification_cache)
    }


async def test_abbreviated_questions():
    """축약형 질문 감지 테스트"""
    print("\n" + "=" * 60)
    print("4. 축약형 질문 감지 테스트 (vs 키워드 없음)")
    print("=" * 60)
    
    from llm_service.utils.question_classifier import is_complex_question
    
    print("\n📝 축약형 질문 테스트:")
    print("   (예: '맨유 토트넘' - vs 키워드 없지만 비교 의도)")
    
    detected_count = 0
    total_count = len(ABBREVIATED_QUESTIONS)
    
    for i, question in enumerate(ABBREVIATED_QUESTIONS, 1):
        # 정규식만으로 판단
        result = await is_complex_question(question, use_llm_fallback=False)
        status = "✅" if result else "❌"
        print(f"  {i:2d}. {status} {question} → {'복잡' if result else '단순'}")
        if result:
            detected_count += 1
    
    detection_rate = (detected_count / total_count) * 100
    print(f"\n📊 축약형 감지율: {detected_count}/{total_count} ({detection_rate:.1f}%)")
    
    if detection_rate < 80:
        print("\n⚠️ 축약형 감지율이 낮습니다. 로직 개선이 필요할 수 있습니다.")
        print("   개선 방안: 'A B' 형식도 비교 질문으로 감지하도록 로직 보강")
    
    return {
        "detection_rate": detection_rate,
        "detected": detected_count,
        "total": total_count
    }


async def test_real_world_questions():
    """실제 소비자 질문 패턴 테스트"""
    print("\n" + "=" * 60)
    print("5. 실제 소비자 질문 패턴 테스트 ⭐")
    print("=" * 60)
    print("   ('~알려주고 ~도 보여줘' 같은 실제 사용 패턴)")
    
    from llm_service.utils.question_classifier import is_complex_question
    
    detected_count = 0
    total_count = len(REAL_WORLD_QUESTIONS)
    
    print(f"\n📝 실제 소비자 질문 패턴 테스트 ({total_count}개):")
    
    for i, question in enumerate(REAL_WORLD_QUESTIONS, 1):
        # 정규식만으로 판단
        result = await is_complex_question(question, use_llm_fallback=False)
        status = "✅" if result else "❌"
        print(f"  {i:2d}. {status} {question}")
        print(f"      → {'복잡 (Agent 사용)' if result else '단순 (chat.py 사용)'}")
        if result:
            detected_count += 1
        else:
            print(f"      ⚠️ 복잡 질문으로 분류되어야 하는데 단순으로 분류됨!")
    
    detection_rate = (detected_count / total_count) * 100
    print(f"\n📊 실제 소비자 질문 패턴 감지율: {detected_count}/{total_count} ({detection_rate:.1f}%)")
    
    if detection_rate == 100:
        print("✅ 모든 실제 소비자 질문 패턴이 올바르게 감지되었습니다!")
    elif detection_rate >= 80:
        print("⚠️ 대부분 감지되지만 일부 개선이 필요할 수 있습니다.")
    else:
        print("❌ 실제 소비자 질문 패턴 감지율이 낮습니다. 로직 개선이 필요합니다.")
        print("   개선 방안: '~알려주고 ~도', '~하고 ~도' 패턴 감지 로직 보강")
    
    return {
        "detection_rate": detection_rate,
        "detected": detected_count,
        "total": total_count
    }


# ============================================
# 메인 함수
# ============================================

async def main():
    """메인 테스트 함수"""
    print("=" * 60)
    print("🤖 하이브리드 질문 분류 로직 테스트")
    print("=" * 60)
    print(f"작업 디렉토리: {os.getcwd()}")
    print(f"OPENAI_API_KEY: {'✅ 설정됨' if os.getenv('OPENAI_API_KEY') else '❌ 미설정'}")
    print("=" * 60)
    
    results = {}
    
    # 1. 정규식 기반 분류 정확도 테스트
    try:
        results["regex"] = await test_regex_classification()
    except Exception as e:
        print(f"\n❌ 정규식 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    # 2. LLM fallback 동작 확인
    try:
        results["llm_fallback"] = await test_llm_fallback()
    except Exception as e:
        print(f"\n❌ LLM fallback 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    # 3. 캐시 동작 확인
    try:
        results["cache"] = await test_cache_behavior()
    except Exception as e:
        print(f"\n❌ 캐시 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. 축약형 질문 감지 테스트
    try:
        results["abbreviated"] = await test_abbreviated_questions()
    except Exception as e:
        print(f"\n❌ 축약형 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    # 최종 요약
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    
    if "regex" in results:
        r = results["regex"]
        print(f"정규식 기반 분류 정확도: {r.get('total_accuracy', 0):.1f}%")
        print(f"  - 단순 질문: {r.get('simple_accuracy', 0):.1f}%")
        print(f"  - 복잡 질문: {r.get('complex_accuracy', 0):.1f}%")
    
    if "llm_fallback" in results and results["llm_fallback"]:
        r = results["llm_fallback"]
        print(f"LLM Fallback: {r.get('llm_success', 0)}/{r.get('total', 0)} 성공")
        print(f"  - 결과 변경: {r.get('changed', 0)}건")
    
    if "cache" in results:
        print(f"캐시 항목 수: {results['cache'].get('cache_size', 0)}개")
    
    if "abbreviated" in results:
        r = results["abbreviated"]
        print(f"축약형 감지율: {r.get('detection_rate', 0):.1f}%")
    
    print("=" * 60)
    print("✅ 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

