import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { GrowdoUploadGuard } from './growdo-upload.guard';
import type { PrivateUploadResult, UploadResult } from './upload.types';

const TEN_MEGABYTES = 10 * 1024 * 1024;
const uploadOptions = {
  limits: {
    fileSize: TEN_MEGABYTES,
  },
};

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    this.ensureFile(file);
    return this.uploadService.uploadImage(file);
  }

  @Post('growdo/image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GrowdoUploadGuard)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadGrowdoImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    this.ensureFile(file);
    return this.uploadService.uploadGrowdoImage(file);
  }

  @Post('growdo/coupon')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GrowdoUploadGuard)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadGrowdoCoupon(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PrivateUploadResult> {
    this.ensureFile(file);
    return this.uploadService.uploadGrowdoCoupon(file);
  }

  @Post('image/profile')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadProfileImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    this.ensureFile(file);
    return this.uploadService.uploadProfileImage(file);
  }

  private ensureFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file || file.size === 0) {
      throw new HttpException(
        { error: '파일이 비어있습니다.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
