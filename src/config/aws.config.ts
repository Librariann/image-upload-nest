import { ConfigService } from '@nestjs/config';
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export const S3_CLIENT = Symbol('S3_CLIENT');
export const S3_SETTINGS = Symbol('S3_SETTINGS');

export interface S3Settings {
  bucket: string;
  growdoBucket: string;
  region: string;
}

function required(config: ConfigService, name: string): string {
  const value = config.get<string>(name);

  if (!value) {
    throw new Error(`필수 환경변수 ${name}가 설정되지 않았습니다.`);
  }

  return value;
}

export const s3SettingsProvider = {
  provide: S3_SETTINGS,
  inject: [ConfigService],
  useFactory: (config: ConfigService): S3Settings => ({
    bucket: required(config, 'AWS_S3_BUCKET'),
    growdoBucket: required(config, 'GROWDO_AWS_S3_BUCKET'),
    region: config.get<string>('AWS_REGION') ?? 'ap-northeast-2',
  }),
};

export const s3ClientProvider = {
  provide: S3_CLIENT,
  inject: [ConfigService, S3_SETTINGS],
  useFactory: (config: ConfigService, settings: S3Settings): S3Client => {
    const clientConfig: S3ClientConfig = {
      region: settings.region,
      credentials: {
        accessKeyId: required(config, 'AWS_ACCESS_KEY'),
        secretAccessKey: required(config, 'AWS_SECRET_KEY'),
      },
    };

    return new S3Client(clientConfig);
  },
};
