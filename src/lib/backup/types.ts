export interface BackupFile {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
}

export interface StorageProvider {
  testConnection(): Promise<void>;
  upload(key: string, body: Buffer): Promise<void>;
  download(key: string): Promise<Buffer>;
  list(prefix: string): Promise<BackupFile[]>;
  delete(key: string): Promise<void>;
}

export interface StorageConfig {
  provider: string;
  endpoint?: string | null;
  region?: string | null;
  bucket?: string | null;
  path: string;
  accessKey?: string | null;
  secretKey?: string | null;
}
