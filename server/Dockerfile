FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 의존성 복사 및 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# .env 파일 명시적으로 복사 (이 줄 추가!)
COPY .env /app/.env

# 나머지 소스 코드 복사
COPY . /app

# 포트 노출
EXPOSE 8080

# 개발 서버 실행 (핫 리로드)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]