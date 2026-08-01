import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import {
  S3_CLIENT,
  S3_SETTINGS,
  type S3Settings,
} from '../config/aws.config';
import type { UploadResult } from './upload.types';

@Injectable()
export class UploadService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(S3_SETTINGS) private readonly settings: S3Settings,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<UploadResult> {
    const fileName = `${randomUUID()}_${file.originalname}`;

    try {
      await this.putObject(fileName, file.buffer, file.mimetype);
      return this.createResult(fileName);
    } catch (error: unknown) {
      throw new HttpException(
        { error: `업로드 중 오류 발생: ${this.errorMessage(error)}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadProfileImage(
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    try {
      const resizedImage = await sharp(file.buffer)
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      const fileName = `${randomUUID()}_profile.jpg`;

      await this.putObject(fileName, resizedImage, 'image/jpeg');
      return this.createResult(fileName);
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
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.settings.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  private createResult(fileName: string): UploadResult {
    return {
      message: '파일 업로드 성공',
      fileName,
      url: `https://${this.settings.bucket}.s3.${this.settings.region}.amazonaws.com/${fileName}`,
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
