import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { S3Client } from "@aws-sdk/client-s3";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { S3_CLIENT } from "../src/config/aws.config";

describe("Upload API (e2e)", () => {
  let app: INestApplication;
  const send = jest.fn().mockResolvedValue({});

  beforeAll(async () => {
    process.env.AWS_ACCESS_KEY = "test-access-key";
    process.env.AWS_SECRET_KEY = "test-secret-key";
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.GROWDO_AWS_S3_BUCKET = "growdo-images";
    process.env.GROWDO_COUPON_S3_BUCKET = "growdo-coupons";
    process.env.GROWDO_UPLOAD_API_KEY = "test-growdo-upload-key";
    process.env.AWS_REGION = "ap-northeast-2";

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
      .post("/api/upload/image")
      .attach("file", Buffer.from("image"), {
        filename: "sample.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      message: "파일 업로드 성공",
    });
    expect(response.body.fileName).toMatch(/^[0-9a-f-]{36}_sample\.png$/);
  });

  it("returns 400 when the file field is absent", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/upload/image")
      .expect(400);

    expect(response.body).toEqual({
      error: "파일이 비어있습니다.",
    });
  });

  it("POST /api/upload/growdo/image uses the Growdo bucket", async () => {
    send.mockClear();

    const response = await request(app.getHttpServer())
      .post("/api/upload/growdo/image")
      .set("x-growdo-upload-key", "test-growdo-upload-key")
      .attach("file", Buffer.from("growdo image"), {
        filename: "sample.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.Bucket).toBe("growdo-images");
    expect(response.body.url).toContain(
      "https://growdo-images.s3.ap-northeast-2.amazonaws.com/",
    );
  });

  it("rejects a Growdo upload when the API key is missing", async () => {
    send.mockClear();

    await request(app.getHttpServer())
      .post("/api/upload/growdo/image")
      .attach("file", Buffer.from("growdo image"), {
        filename: "sample.png",
        contentType: "image/png",
      })
      .expect(401);

    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a Growdo upload when the API key is incorrect", async () => {
    send.mockClear();

    await request(app.getHttpServer())
      .post("/api/upload/growdo/image")
      .set("x-growdo-upload-key", "incorrect-key")
      .attach("file", Buffer.from("growdo image"), {
        filename: "sample.png",
        contentType: "image/png",
      })
      .expect(401);

    expect(send).not.toHaveBeenCalled();
  });

  it("POST /api/upload/growdo/coupon uses the private coupon bucket", async () => {
    send.mockClear();

    const response = await request(app.getHttpServer())
      .post("/api/upload/growdo/coupon")
      .set("x-growdo-upload-key", "test-growdo-upload-key")
      .attach("file", Buffer.from("coupon image"), {
        filename: "coupon.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(send.mock.calls[0][0].input.Bucket).toBe("growdo-coupons");
    expect(response.body).toEqual({
      message: "파일 업로드 성공",
      fileName: send.mock.calls[0][0].input.Key,
    });
  });

  it("GET /api/upload/growdo/coupon/:fileName reads from the private bucket", async () => {
    send.mockReset();
    send.mockResolvedValueOnce({
      Body: {
        transformToByteArray: () => Promise.resolve(Uint8Array.from([1, 2, 3])),
      },
      ContentType: "image/png",
    });

    const response = await request(app.getHttpServer())
      .get("/api/upload/growdo/coupon/coupon.png")
      .set("x-growdo-upload-key", "test-growdo-upload-key")
      .expect(200);

    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "growdo-coupons",
      Key: "coupon.png",
    });
  });

  it("DELETE /api/upload/growdo/coupon/:fileName deletes from the private bucket", async () => {
    send.mockReset();
    send.mockResolvedValueOnce({});

    await request(app.getHttpServer())
      .delete("/api/upload/growdo/coupon/coupon.png")
      .set("x-growdo-upload-key", "test-growdo-upload-key")
      .expect(204);

    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "growdo-coupons",
      Key: "coupon.png",
    });
  });

  it.each(["get", "delete"] as const)(
    "rejects %s coupon access without the API key",
    async (method) => {
      send.mockClear();
      await request(app.getHttpServer())
        [method]("/api/upload/growdo/coupon/coupon.png")
        .expect(401);
      expect(send).not.toHaveBeenCalled();
    },
  );
});
