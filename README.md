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
- `GROWDO_AWS_S3_BUCKET` (Growdo 버킷, 예: `growdo-images`)
- `GROWDO_COUPON_S3_BUCKET` (비공개 쿠폰 버킷, 예: `growdo-coupons`)
- `GROWDO_UPLOAD_API_KEY` (Growdo 백엔드와 공유하는 비밀키)

선택 환경변수:

- `AWS_REGION` (기본값: `ap-northeast-2`)
- `PORT` (기본값: `8080`)

## API

- `POST /api/upload/image`: `file` multipart 필드의 원본을 업로드합니다.
- `POST /api/upload/growdo/image`: `file` multipart 필드의 원본을 일반 Growdo 이미지 버킷에 업로드합니다.
- `POST /api/upload/growdo/coupon`: `file` multipart 필드의 원본을 비공개 쿠폰 버킷에 업로드합니다. 응답에는 S3 URL 없이 `fileName`만 포함합니다.
- `GET /api/upload/growdo/coupon/:fileName`: 비공개 쿠폰 이미지를 반환합니다.
- `DELETE /api/upload/growdo/coupon/:fileName`: 비공개 쿠폰 이미지를 삭제합니다.
- `POST /api/upload/image/profile`: 이미지를 최대 200×200 크기의 JPEG
  (품질 80)로 변환해 업로드합니다.

파일 및 요청 최대 크기는 기존 서버와 동일하게 10MB입니다.

Growdo 전용 이미지 API는 `x-growdo-upload-key` 요청 헤더가
`GROWDO_UPLOAD_API_KEY`와 일치할 때만 요청을 처리합니다. 같은 키를
Growdo 백엔드와 업로드 서버의 환경변수에 설정하고 프론트엔드에는
노출하지 않습니다.

쿠폰 조회 요청은 Growdo 백엔드가 사용자와 쿠폰 소유 관계를 먼저
확인한 뒤 이 서버의 비공개 조회 API를 호출합니다. 따라서 브라우저에는
업로드 서버 주소나 API 키가 노출되지 않습니다.

`growdo-images`의 이미지를 일반 S3 URL로 외부에 보여주려면 해당
버킷에만 공개 `s3:GetObject` 정책을 적용해야 합니다. `growdo-coupons`는
공개 접근 차단을 유지하고 공개 읽기 정책을 적용하지 않습니다.

## 검증

```bash
npm run build
npm test
npm run test:e2e
```
