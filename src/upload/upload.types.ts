export interface UploadResult {
  message: string;
  fileName: string;
  url: string;
}

export type PrivateUploadResult = Pick<UploadResult, 'message' | 'fileName'>;
