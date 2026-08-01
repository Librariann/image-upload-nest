# upload-server

Amazon S3에 이미지를 업로드하는 NestJS 서버입니다. 기존 Spring Boot
서버의 엔드포인트와 응답 형식을 유지합니다.

## 실행

```bash
cp .env.example .env
npm install
npm run start:dev
```

기본 포트는 `8080`입니다.

필수 환경변수:

- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `AWS_S3_BUCKET`

선택 환경변수:

- `AWS_REGION` (기본값: `ap-northeast-2`)
- `PORT` (기본값: `8080`)

## API

- `POST /api/upload/image`: `file` multipart 필드의 원본을 업로드합니다.
- `POST /api/upload/image/profile`: 이미지를 최대 200×200 크기의 JPEG
  (품질 80)로 변환해 업로드합니다.

파일 및 요청 최대 크기는 기존 서버와 동일하게 10MB입니다.

## 검증

```bash
npm run build
npm test
npm run test:e2e
```
