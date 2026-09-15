import { Module } from '@nestjs/common';
import {
  s3ClientProvider,
  s3SettingsProvider,
} from '../config/aws.config';
import { UploadController } from './upload.controller';
import { GrowdoUploadGuard } from './growdo-upload.guard';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [s3SettingsProvider, s3ClientProvider, GrowdoUploadGuard, UploadService],
})
export class UploadModule {}
