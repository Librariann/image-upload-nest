import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { S3Client } from '@aws-sdk/client-s3';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { S3_CLIENT } from '../src/config/aws.config';

describe('Upload API (e2e)', () => {
  let app: INestApplication;
  const send = jest.fn().mockResolvedValue({});

  beforeAll(async () => {
    process.env.AWS_ACCESS_KEY = 'test-access-key';
    process.env.AWS_SECRET_KEY = 'test-secret-key';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.AWS_REGION = 'ap-northeast-2';

    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send } as unknown as S3Client)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/upload/image uploads multipart field "file"', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/upload/image')
      .attach('file', Buffer.from('image'), {
        filename: 'sample.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      message: '파일 업로드 성공',
    });
    expect(response.body.fileName).toMatch(
      /^[0-9a-f-]{36}_sample\.png$/,
    );
  });

  it('returns 400 when the file field is absent', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/upload/image')
      .expect(400);

    expect(response.body).toEqual({
      error: '파일이 비어있습니다.',
    });
  });
});
