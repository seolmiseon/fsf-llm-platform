# Node.js 20 버전을 베이스 이미지로 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 yarn.lock 파일을 먼저 복사 (캐싱 최적화)
COPY package.json yarn.lock ./

# 의존성 설치 (yarn 사용, 네트워크 타임아웃 설정)
RUN yarn install --frozen-lockfile --network-timeout 300000

# 소스 코드 복사
COPY . .

# 포트 3000 노출
EXPOSE 3000

# 개발 모드로 실행 (빌드 에러 무시)
CMD ["yarn", "dev"] 