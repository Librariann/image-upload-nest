export interface UploadResult {
  message: string;
  fileName: string;
  url: string;
}

export type PrivateUploadResult = Pick<UploadResult, "message" | "fileName">;

export interface PrivateFileResult {
  body: Buffer;
  contentType: string;
}
