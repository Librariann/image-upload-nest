import { HttpException, HttpStatus } from "@nestjs/common";
import type { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { UploadService } from "./upload.service";

describe("UploadService", () => {
  const send = jest.fn();
  const service = new UploadService({ send } as unknown as S3Client, {
    bucket: "test-bucket",
    growdoBucket: "growdo-images",
    growdoCouponBucket: "growdo-coupons",
    region: "ap-northeast-2",
  });

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
  });

  it("uploads an original file and preserves the response contract", async () => {
    const result = await service.uploadImage(
      file(Buffer.from("contents"), "sample.png", "image/png"),
    );
    const input = send.mock.calls[0][0].input;

    expect(input).toMatchObject({
      Bucket: "test-bucket",
      Body: Buffer.from("contents"),
      ContentType: "image/png",
    });
    expect(input.Key).toMatch(/^[0-9a-f-]{36}_sample\.png$/);
    expect(result).toEqual({
      message: "파일 업로드 성공",
      fileName: input.Key,
      url: `https://test-bucket.s3.ap-northeast-2.amazonaws.com/${input.Key}`,
    });
  });

  it("uploads a Growdo image to its separate bucket", async () => {
    const result = await service.uploadGrowdoImage(
      file(Buffer.from("growdo image"), "sample.png", "image/png"),
    );
    const input = send.mock.calls[0][0].input;

    expect(input).toMatchObject({
      Bucket: "growdo-images",
      Body: Buffer.from("growdo image"),
      ContentType: "image/png",
    });
    expect(result.url).toBe(
      `https://growdo-images.s3.ap-northeast-2.amazonaws.com/${input.Key}`,
    );
  });

  it("uploads a coupon privately without returning a direct S3 URL", async () => {
    const result = await service.uploadGrowdoCoupon(
      file(Buffer.from("coupon image"), "coupon.png", "image/png"),
    );
    const input = send.mock.calls[0][0].input;

    expect(input).toMatchObject({
      Bucket: "growdo-coupons",
      Body: Buffer.from("coupon image"),
      ContentType: "image/png",
    });
    expect(result).toEqual({
      message: "파일 업로드 성공",
      fileName: input.Key,
    });
  });

  it("reads a coupon from the private bucket", async () => {
    send.mockResolvedValueOnce({
      Body: {
        transformToByteArray: () => Promise.resolve(Uint8Array.from([1, 2, 3])),
      },
      ContentType: "image/png",
    });

    await expect(service.readGrowdoCoupon("coupon.png")).resolves.toEqual({
      body: Buffer.from([1, 2, 3]),
      contentType: "image/png",
    });
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "growdo-coupons",
      Key: "coupon.png",
    });
  });

  it("deletes a coupon from the private bucket", async () => {
    await expect(
      service.deleteGrowdoCoupon("coupon.png"),
    ).resolves.toBeUndefined();
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "growdo-coupons",
      Key: "coupon.png",
    });
  });

  it.each(["../coupon.png", "folder/coupon.png", "folder\\coupon.png"])(
    "rejects an unsafe coupon key: %s",
    async (key) => {
      await expect(service.readGrowdoCoupon(key)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("converts a profile image to a JPEG bounded by 200x200", async () => {
    const inputImage = await sharp({
      create: {
        width: 400,
        height: 100,
        channels: 3,
        background: "red",
      },
    })
      .png()
      .toBuffer();

    await service.uploadProfileImage(
      file(inputImage, "profile.png", "image/png"),
    );

    const input = send.mock.calls[0][0].input;
    const metadata = await sharp(input.Body).metadata();

    expect(input.Key).toMatch(/^[0-9a-f-]{36}_profile\.jpg$/);
    expect(input.ContentType).toBe("image/jpeg");
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(50);
  });

  it("maps an S3 failure to the original error message", async () => {
    send.mockRejectedValueOnce(new Error("S3 unavailable"));

    await expect(
      service.uploadImage(
        file(Buffer.from("contents"), "sample.png", "image/png"),
      ),
    ).rejects.toEqual(
      new HttpException(
        { error: "업로드 중 오류 발생: S3 unavailable" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });
});

function file(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Express.Multer.File {
  return {
    buffer,
    originalname,
    mimetype,
    size: buffer.length,
    fieldname: "file",
    encoding: "7bit",
    stream: undefined as never,
    destination: "",
    filename: "",
    path: "",
  };
}
