import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type { StorageProvider, StorageConfig, BackupFile } from "./types";

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    if (!config.bucket) throw new Error("Bucket is required");
    if (!config.accessKey) throw new Error("Access key is required");
    if (!config.secretKey) throw new Error("Secret key is required");

    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region || "us-east-1",
      ...(config.endpoint ? {
        endpoint: config.endpoint,
        forcePathStyle: true,
      } : {}),
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async testConnection(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async upload(key: string, body: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
    }));
  }

  async download(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of res.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async list(prefix: string): Promise<BackupFile[]> {
    const files: BackupFile[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const obj of res.Contents ?? []) {
        if (!obj.Key || !obj.Key.endsWith(".tar")) continue;
        files.push({
          key: obj.Key,
          name: obj.Key.split("/").pop() || obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(),
        });
      }

      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    return files;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
}
