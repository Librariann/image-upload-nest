import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { S3_CLIENT, S3_SETTINGS, type S3Settings } from "../config/aws.config";
import type {
  PrivateFileResult,
  PrivateUploadResult,
  UploadResult,
} from "./upload.types";

@Injectable()
export class UploadService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(S3_SETTINGS) private readonly settings: S3Settings,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<UploadResult> {
    const fileName = await this.uploadOriginalImage(file, this.settings.bucket);
    return this.createResult(this.settings.bucket, fileName);
  }

  async uploadGrowdoImage(file: Express.Multer.File): Promise<UploadResult> {
    const fileName = await this.uploadOriginalImage(
      file,
      this.settings.growdoBucket,
    );
    return this.createResult(this.settings.growdoBucket, fileName);
  }

  async uploadGrowdoCoupon(
    file: Express.Multer.File,
  ): Promise<PrivateUploadResult> {
    const fileName = await this.uploadOriginalImage(
      file,
      this.settings.growdoCouponBucket,
    );
    return { message: "파일 업로드 성공", fileName };
  }

  async readGrowdoCoupon(fileName: string): Promise<PrivateFileResult> {
    const key = this.validateCouponKey(fileName);

    try {
      const result = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.settings.growdoCouponBucket,
          Key: key,
        }),
      );
      if (!result.Body) {
        throw new Error("empty coupon body");
      }

      return {
        body: Buffer.from(await result.Body.transformToByteArray()),
        contentType: this.validateCouponContentType(result.ContentType),
      };
    } catch (error: unknown) {
      if (this.isMissingObject(error)) {
        throw new HttpException(
          { error: "쿠폰 이미지를 찾을 수 없습니다." },
          HttpStatus.NOT_FOUND,
        );
      }
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: "쿠폰 이미지를 불러올 수 없습니다." },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteGrowdoCoupon(fileName: string): Promise<void> {
    const key = this.validateCouponKey(fileName);

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.settings.growdoCouponBucket,
          Key: key,
        }),
      );
    } catch {
      throw new HttpException(
        { error: "쿠폰 이미지를 정리할 수 없습니다." },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async uploadOriginalImage(
    file: Express.Multer.File,
    bucket: string,
  ): Promise<string> {
    const fileName = `${randomUUID()}_${file.originalname}`;

    try {
      await this.putObject(bucket, fileName, file.buffer, file.mimetype);
      return fileName;
    } catch (error: unknown) {
      throw new HttpException(
        { error: `업로드 중 오류 발생: ${this.errorMessage(error)}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<UploadResult> {
    try {
      const resizedImage = await sharp(file.buffer)
        .resize(200, 200, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();
      const fileName = `${randomUUID()}_profile.jpg`;

      await this.putObject(
        this.settings.bucket,
        fileName,
        resizedImage,
        "image/jpeg",
      );
      return this.createResult(this.settings.bucket, fileName);
    } catch (error: unknown) {
      throw new HttpException(
        {
          error: `파일 처리 중 오류 발생: ${this.errorMessage(error)}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  private createResult(bucket: string, fileName: string): UploadResult {
    return {
      message: "파일 업로드 성공",
      fileName,
      url: `https://${bucket}.s3.${this.settings.region}.amazonaws.com/${fileName}`,
    };
  }

  private validateCouponKey(value: string): string {
    const key = value.trim();
    if (
      !key ||
      key.length > 300 ||
      key.includes("/") ||
      key.includes("\\") ||
      key.includes("..")
    ) {
      throw new HttpException(
        { error: "올바르지 않은 쿠폰 이미지 이름입니다." },
        HttpStatus.BAD_REQUEST,
      );
    }
    return key;
  }

  private validateCouponContentType(value: string | undefined): string {
    if (value && ["image/png", "image/jpeg", "image/webp"].includes(value)) {
      return value;
    }
    throw new HttpException(
      { error: "지원하지 않는 쿠폰 이미지 형식입니다." },
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }

  private isMissingObject(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === "NoSuchKey" || error.name === "NotFound")
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
