import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

const API_KEY_HEADER = 'x-growdo-upload-key';

@Injectable()
export class GrowdoUploadGuard implements CanActivate {
  private readonly expectedKey: Buffer;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GROWDO_UPLOAD_API_KEY');
    if (!apiKey) {
      throw new Error(
        '필수 환경변수 GROWDO_UPLOAD_API_KEY가 설정되지 않았습니다.',
      );
    }
    this.expectedKey = Buffer.from(apiKey);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const provided = request.headers[API_KEY_HEADER];

    if (typeof provided !== 'string') {
      throw new UnauthorizedException('Growdo 업로드 API 키가 필요합니다.');
    }

    const providedKey = Buffer.from(provided);
    if (
      providedKey.length !== this.expectedKey.length ||
      !timingSafeEqual(providedKey, this.expectedKey)
    ) {
      throw new UnauthorizedException('Growdo 업로드 API 키가 올바르지 않습니다.');
    }

    return true;
  }
}
