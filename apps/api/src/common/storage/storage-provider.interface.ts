export interface StorageUploadResult {
  key: string;
  url: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  bytes?: number | null;
}

export interface StorageDeleteResult {
  success: boolean;
}

export interface IStorageProvider {
  readonly providerName: string;

  upload(params: {
    folder: string;
    filename?: string;
    buffer: Buffer;
    mimetype: string;
  }): Promise<StorageUploadResult>;

  delete(key: string): Promise<StorageDeleteResult>;
}
