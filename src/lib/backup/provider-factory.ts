import type { StorageProvider, StorageConfig } from "./types";
import { S3StorageProvider } from "./s3-provider";

export function createProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "s3":
      return new S3StorageProvider(config);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}
