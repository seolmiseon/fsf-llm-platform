import os
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
from .prompt_service import PromptService
import google.generativeai as genai
from PIL import Image
import io

load_dotenv()
client = OpenAI()

# Gemini API 초기화 (Vision 대체용)
gemini_api_key = os.getenv("GOOGLE_AI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')  # 비용 효율적인 모델
else:
    gemini_model = None


class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.embedding_model = os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )
        self.prompt_service = PromptService()

    async def generate_chat_response(self, messages: List[Dict[str, str]]) -> str:
        """채팅 응답 생성"""
        try:
            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )
            return response.choices[0].message.content

        except Exception as e:
            print(f"OpenAI 채팅 응답 생성 오류: {e}")
            return "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다."

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """텍스트 임베딩 생성"""
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model, input=texts
            )
            return [data.embedding for data in response.data]

        except Exception as e:
            print(f"OpenAI 임베딩 생성 오류: {e}")
            return []

    async def generate_single_embedding(self, text: str) -> List[float]:
        """단일 텍스트 임베딩 생성"""
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model, input=[text]
            )
            return response.data[0].embedding

        except Exception as e:
            print(f"OpenAI 단일 임베딩 생성 오류: {e}")
            return []

    async def emergency_assessment(self, message: str) -> str:
        """응급 상황 1차 판단"""
        try:
            # 동적 프롬프트 생성 (기존 시스템 활용)
            emergency_prompt_template = self.prompt_service.manager.get_prompt(
                "gps_alerts", "EMERGENCY_ASSESSMENT_PROMPT"
            )
            emergency_prompt = emergency_prompt_template.format(situation=message)

            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[{"role": "user", "content": emergency_prompt}],
                temperature=0.3,  # 응급 상황이므로 창의성보다 정확성 중시
                max_tokens=500,
            )
            return response.choices[0].message.content

        except Exception as e:
            print(f"응급 상황 판단 오류: {e}")
            return "응급 상황 판단 중 오류가 발생했습니다. 의심스러우면 즉시 119에 신고하세요."

    async def analyze_image_emergency(self, image_data: bytes, context: str) -> str:
        """응급 상황 이미지 분석 (Gemini Vision) - 비용 절감"""
        try:
            if not gemini_model:
                return "Gemini API 키가 설정되지 않았습니다."

            # 이미지를 PIL Image로 변환
            image = Image.open(io.BytesIO(image_data))

            prompt_text = f"응급 상황 이미지를 분석해주세요. 상황: {context}\n\n이미지에서 보이는 증상을 분석하고 응급도를 판단해주세요."

            # Gemini API 호출
            response = gemini_model.generate_content([prompt_text, image])
            return response.text
        except Exception as e:
            print(f"응급 이미지 분석 오류: {e}")
            return "이미지 분석 중 오류가 발생했습니다. 응급 상황이 의심되면 즉시 병원에 가세요."

    async def analyze_match_chart(self, image_data: bytes, user_question: str = "경기 차트를 분석해주세요") -> str:
        """경기 차트 이미지 분석 (Gemini Vision) - 비용 절감"""
        try:
            if not gemini_model:
                return "Gemini API 키가 설정되지 않았습니다. GOOGLE_AI_API_KEY 환경변수를 확인해주세요."

            # 이미지를 PIL Image로 변환
            image = Image.open(io.BytesIO(image_data))

            # PromptService에서 동적 프롬프트 가져오기
            prompt_text = self.prompt_service.manager.format_prompt(
                'vision_analysis',
                'MATCH_CHART_PROMPT',
                user_question=user_question
            )

            # Gemini API 호출
            response = gemini_model.generate_content([prompt_text, image])
            return response.text

        except Exception as e:
            print(f"경기 차트 분석 오류: {e}")
            return "경기 차트 분석 중 오류가 발생했습니다. 다시 시도해주세요."

    async def analyze_injury_photo(self, image_data: bytes) -> str:
        """부상 사진 분석 (Gemini Vision) - 비용 절감"""
        try:
            if not gemini_model:
                return "Gemini API 키가 설정되지 않았습니다."

            # 이미지를 PIL Image로 변환
            image = Image.open(io.BytesIO(image_data))

            prompt_text = self.prompt_service.manager.get_prompt(
                'vision_analysis',
                'INJURY_ANALYSIS_PROMPT'
            )

            # Gemini API 호출
            response = gemini_model.generate_content([prompt_text, image])
            return response.text
        except Exception as e:
            print(f"부상 사진 분석 오류: {e}")
            return "부상 사진 분석 중 오류가 발생했습니다."

    async def analyze_tactical_board(self, image_data: bytes) -> str:
        """전술 보드 분석 (Gemini Vision) - 비용 절감"""
        try:
            if not gemini_model:
                return "Gemini API 키가 설정되지 않았습니다."

            # 이미지를 PIL Image로 변환
            image = Image.open(io.BytesIO(image_data))

            prompt_text = self.prompt_service.manager.get_prompt(
                'vision_analysis',
                'TACTICAL_BOARD_PROMPT'
            )

            # Gemini API 호출
            response = gemini_model.generate_content([prompt_text, image])
            return response.text
        except Exception as e:
            print(f"전술 보드 분석 오류: {e}")
            return "전술 보드 분석 중 오류가 발생했습니다."

    async def analyze_player_comparison(self, image_data: bytes) -> str:
        """선수 비교 차트 분석 (Gemini Vision) - 비용 절감"""
        try:
            if not gemini_model:
                return "Gemini API 키가 설정되지 않았습니다."

            # 이미지를 PIL Image로 변환
            image = Image.open(io.BytesIO(image_data))

            prompt_text = self.prompt_service.manager.get_prompt(
                'vision_analysis',
                'PLAYER_COMPARISON_CHART_PROMPT'
            )

            # Gemini API 호출
            response = gemini_model.generate_content([prompt_text, image])
            return response.text
        except Exception as e:
            print(f"선수 비교 분석 오류: {e}")
            return "선수 비교 분석 중 오류가 발생했습니다."

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """비동기 chat 메서드 (chat.py 호환용)"""
        return await self.generate_chat_response(messages)

    def count_tokens(self, text: str) -> int:
        """토큰 수 계산 (대략적)"""
        return len(text) // 4
