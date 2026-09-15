import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class GrowdoUploadGuard implements CanActivate {
  private readonly apiKey: Buffer;

  constructor(config: ConfigService) {
    const key = config.get<string>('GROWDO_UPLOAD_API_KEY');
    if (!key) {
      throw new Error('필수 환경변수 GROWDO_UPLOAD_API_KEY가 설정되지 않았습니다.');
    }
    this.apiKey = Buffer.from(key);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { 'x-growdo-upload-key'?: string | string[] };
    }>();
    const provided = request.headers['x-growdo-upload-key'];
    if (typeof provided !== 'string') {
      throw new UnauthorizedException('Growdo 업로드 인증이 필요합니다.');
    }

    const providedKey = Buffer.from(provided);
    if (
      providedKey.length !== this.apiKey.length ||
      !timingSafeEqual(providedKey, this.apiKey)
    ) {
      throw new UnauthorizedException('Growdo 업로드 인증이 필요합니다.');
    }
    return true;
  }
}
