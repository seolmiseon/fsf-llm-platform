"""
한국 선수 이름 매핑 스크립트
espn_player_ids.json에 ko_name, ko_team 필드 추가

사용법:
    python -m llm_service.scrapers.add_ko_names
"""

import json
import os
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# 한국 선수 이름 매핑 (수동으로 알려진 선수들)
KNOWN_KOREAN_PLAYERS = {
    "Son Heung-Min": "손흥민",
    "Heung-Min Son": "손흥민",
    "Lee Kang-In": "이강인",
    "Kang-In Lee": "이강인",
    "Hwang Hee-Chan": "황희찬",
    "Hee-Chan Hwang": "황희찬",
    "Kim Min-Jae": "김민재",
    "Min-Jae Kim": "김민재",
    "Lee Jae-Sung": "이재성",
    "Jae-Sung Lee": "이재성",
    "Hwang Ui-Jo": "황의조",
    "Ui-Jo Hwang": "황의조",
    "Cho Gue-Sung": "조규성",
    "Gue-Sung Cho": "조규성",
    "Oh Hyeon-Gyu": "오현규",
    "Hyeon-Gyu Oh": "오현규",
}

# 팀 이름 한글 매핑 (주요 팀만)
KNOWN_TEAMS_KO = {
    "Tottenham Hotspur": "토트넘",
    "Tottenham": "토트넘",
    "Manchester City": "맨체스터 시티",
    "Manchester United": "맨체스터 유나이티드",
    "Arsenal": "아스날",
    "Liverpool": "리버풀",
    "Chelsea": "첼시",
    "Barcelona": "바르셀로나",
    "Real Madrid": "레알 마드리드",
    "Paris Saint-Germain": "파리 생제르맹",
    "PSG": "파리 생제르맹",
    "Bayern Munich": "바이에른 뮌헨",
    "LAFC": "LAFC",
    "Los Angeles FC": "LAFC",
}


def load_json_file() -> Dict:
    """espn_player_ids.json 로드"""
    json_file = os.path.join(
        os.path.dirname(__file__), '../data/espn_player_ids.json'
    )
    
    if not os.path.exists(json_file):
        raise FileNotFoundError(f"JSON 파일을 찾을 수 없습니다: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json_file(data: Dict):
    """espn_player_ids.json 저장"""
    json_file = os.path.join(
        os.path.dirname(__file__), '../data/espn_player_ids.json'
    )
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON 파일 저장 완료: {json_file}")


def is_korean_name_pattern(name: str) -> bool:
    """이름 패턴으로 한국 선수 추정 (간단한 휴리스틱)"""
    # 한국 성씨 패턴
    korean_surnames = ['Son', 'Lee', 'Kim', 'Park', 'Hwang', 'Cho', 'Oh', 'Jung', 'Choi', 'Kang']
    
    first_part = name.split()[0] if ' ' in name else name.split('-')[0]
    return first_part in korean_surnames


def get_ko_name_with_llm(english_name: str, client: OpenAI) -> str:
    """LLM을 사용해서 영문 이름을 한글 이름으로 변환"""
    try:
        prompt = f"""다음 축구 선수의 영문 이름을 한국어로 정확하게 번역해주세요.
영문 이름만 출력하고, 다른 설명은 하지 마세요.

예시:
- Son Heung-Min → 손흥민
- Lee Kang-In → 이강인
- Erling Haaland → 엘링 홀란

영문 이름: {english_name}
한글 이름:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "축구 선수 이름을 한국어로 정확하게 번역하는 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        ko_name = response.choices[0].message.content.strip()
        # 따옴표 제거
        ko_name = ko_name.strip('"').strip("'")
        return ko_name
        
    except Exception as e:
        print(f"⚠️ LLM 변환 실패 ({english_name}): {e}")
        return ""


def add_ko_names_to_json(use_llm: bool = False, limit: int = None):
    """
    espn_player_ids.json에 ko_name, ko_team 필드 추가
    
    Args:
        use_llm: LLM을 사용해서 한글 이름 생성 (False면 수동 매핑만)
        limit: 처리할 선수 수 제한 (None이면 전체)
    """
    data = load_json_file()
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if use_llm else None
    
    total_updated = 0
    total_players = 0
    
    for league, players in data.items():
        print(f"\n📋 리그 처리 중: {league} ({len(players)}명)")
        
        for i, player in enumerate(players):
            if limit and i >= limit:
                break
            
            total_players += 1
            updated = False
            
            # 1. ko_name 추가
            if 'ko_name' not in player or not player.get('ko_name'):
                english_name = player.get('name', '')
                
                # 수동 매핑 우선
                if english_name in KNOWN_KOREAN_PLAYERS:
                    player['ko_name'] = KNOWN_KOREAN_PLAYERS[english_name]
                    updated = True
                # 한국 이름 패턴 + LLM 사용
                elif use_llm and client and is_korean_name_pattern(english_name):
                    ko_name = get_ko_name_with_llm(english_name, client)
                    if ko_name:
                        player['ko_name'] = ko_name
                        updated = True
                        print(f"  ✅ {english_name} → {ko_name} (LLM)")
            
            # 2. ko_team 추가
            if 'ko_team' not in player or not player.get('ko_team'):
                english_team = player.get('team', '')
                
                if english_team in KNOWN_TEAMS_KO:
                    player['ko_team'] = KNOWN_TEAMS_KO[english_team]
                    updated = True
            
            if updated:
                total_updated += 1
    
    print(f"\n📊 처리 완료:")
    print(f"  - 총 선수: {total_players}명")
    print(f"  - 업데이트: {total_updated}명")
    
    # JSON 저장
    save_json_file(data)
    
    return total_updated


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="espn_player_ids.json에 한글 이름 추가")
    parser.add_argument(
        '--use-llm',
        action='store_true',
        help='LLM을 사용해서 한글 이름 자동 생성 (비용 발생)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='처리할 선수 수 제한 (테스트용)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🇰🇷 한국 선수 이름 매핑 스크립트")
    print("=" * 60)
    
    if args.use_llm:
        print("⚠️ LLM 모드: OpenAI API 비용이 발생할 수 있습니다.")
        response = input("계속하시겠습니까? (y/n): ")
        if response.lower() != 'y':
            print("취소되었습니다.")
            exit(0)
    
    try:
        add_ko_names_to_json(use_llm=args.use_llm, limit=args.limit)
        print("\n✅ 완료!")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

