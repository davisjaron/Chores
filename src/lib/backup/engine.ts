import { execSync } from "child_process";
import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { prisma } from "../prisma";
import { decrypt } from "./crypto";
import { createProvider } from "./provider-factory";
import type { StorageConfig, BackupFile } from "./types";

const DATA_DIR = process.env.NODE_ENV === "production"
  ? "/app/data"
  : join(process.cwd(), "data");

const UPLOADS_DIR = process.env.NODE_ENV === "production"
  ? "/app/data/uploads"
  : join(process.cwd(), "prisma", "data", "uploads");

const DB_PATH = process.env.NODE_ENV === "production"
  ? "/app/data/dev.db"
  : join(process.cwd(), "data", "dev.db");

const TEMP_DIR = join(DATA_DIR, ".backup-tmp");

function getDbPath(): string {
  const url = process.env.DATABASE_URL || "";
  const match = url.match(/^file:(.+)$/);
  if (match) {
    const p = match[1];
    if (p.startsWith("/")) return p;
    return join(process.cwd(), p);
  }
  return DB_PATH;
}

function getUploadsDir(): string {
  if (existsSync(UPLOADS_DIR)) return UPLOADS_DIR;
  const alt = join(process.cwd(), "prisma", "data", "uploads");
  if (existsSync(alt)) return alt;
  return UPLOADS_DIR;
}

export async function getBackupStorageConfig(): Promise<StorageConfig | null> {
  const config = await prisma.backupConfig.findUnique({ where: { id: "default" } });
  if (!config?.bucket || !config.accessKeyEncrypted || !config.secretKeyEncrypted) return null;
  return {
    provider: config.provider,
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    path: config.path,
    accessKey: decrypt(config.accessKeyEncrypted),
    secretKey: decrypt(config.secretKeyEncrypted),
  };
}

function writeTarEntry(parts: { name: string; data: Buffer }[]): Buffer {
  const blocks: Buffer[] = [];

  for (const { name, data } of parts) {
    const header = Buffer.alloc(512, 0);
    const nameBytes = Buffer.from(name, "utf8");
    nameBytes.copy(header, 0, 0, Math.min(nameBytes.length, 100));

    const sizeStr = data.length.toString(8).padStart(11, "0");
    Buffer.from("0000644\0").copy(header, 100); // mode
    Buffer.from("0001000\0").copy(header, 108); // uid
    Buffer.from("0001000\0").copy(header, 116); // gid
    Buffer.from(sizeStr + "\0").copy(header, 124); // size
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0");
    Buffer.from(mtime + "\0").copy(header, 136); // mtime
    header[156] = 48; // '0' = regular file

    Buffer.from("        ").copy(header, 148);
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    Buffer.from(checksum.toString(8).padStart(6, "0") + "\0 ").copy(header, 148);

    blocks.push(header);
    blocks.push(data);
    const padding = 512 - (data.length % 512);
    if (padding < 512) blocks.push(Buffer.alloc(padding, 0));
  }

  blocks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(blocks);
}

function readTarEntries(tar: Buffer): { name: string; data: Buffer }[] {
  const entries: { name: string; data: Buffer }[] = [];
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const nameEnd = header.indexOf(0);
    const name = header.subarray(0, Math.min(nameEnd >= 0 ? nameEnd : 100, 100)).toString("utf8").trim();
    if (!name) break;

    const sizeStr = header.subarray(124, 135).toString("utf8").trim();
    const size = parseInt(sizeStr, 8) || 0;

    offset += 512;
    const data = tar.subarray(offset, offset + size);
    entries.push({ name, data: Buffer.from(data) });

    offset += size;
    const padding = 512 - (size % 512);
    if (padding < 512) offset += padding;
  }

  return entries;
}

function safeSqliteBackup(dbPath: string, destPath: string): void {
  if (!existsSync(dbPath)) throw new Error("Database file not found");
  try {
    execSync(`sqlite3 "${dbPath}" ".backup '${destPath}'"`, {
      timeout: 60000,
      stdio: "pipe",
    });
  } catch {
    const src = readFileSync(dbPath);
    writeFileSync(destPath, src);
  }
}

export async function createBackup(): Promise<{ filename: string; size: number }> {
  const storageConfig = await getBackupStorageConfig();
  if (!storageConfig) throw new Error("Backup storage not configured");

  mkdirSync(TEMP_DIR, { recursive: true });
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `chores-backup-${timestamp}.tar`;

  const dbPath = getDbPath();
  const tempDbPath = join(TEMP_DIR, "database.db");
  safeSqliteBackup(dbPath, tempDbPath);
  const dbData = readFileSync(tempDbPath);

  const tarParts: { name: string; data: Buffer }[] = [
    { name: "database.db", data: dbData },
  ];

  const uploadsDir = getUploadsDir();
  if (existsSync(uploadsDir)) {
    const files = readdirSync(uploadsDir);
    for (const file of files) {
      const filePath = join(uploadsDir, file);
      if (statSync(filePath).isFile()) {
        tarParts.push({
          name: `uploads/${file}`,
          data: readFileSync(filePath),
        });
      }
    }
  }

  const manifest = {
    version: 1,
    createdAt: now.toISOString(),
    dbFile: "database.db",
    uploadsDir: "uploads/",
    appVersion: process.env.npm_package_version || "unknown",
  };
  tarParts.push({
    name: "manifest.json",
    data: Buffer.from(JSON.stringify(manifest, null, 2)),
  });

  const tarBuffer = writeTarEntry(tarParts);

  try { unlinkSync(tempDbPath); } catch {}

  const provider = createProvider(storageConfig);
  const key = `${storageConfig.path}/${filename}`;
  await provider.upload(key, tarBuffer);

  await prisma.backupConfig.update({
    where: { id: "default" },
    data: {
      lastBackupAt: now.toISOString(),
      lastBackupStatus: "success",
      lastBackupError: null,
      lastBackupFile: filename,
    },
  });

  return { filename, size: tarBuffer.length };
}

export async function listBackups(): Promise<BackupFile[]> {
  const storageConfig = await getBackupStorageConfig();
  if (!storageConfig) return [];
  const provider = createProvider(storageConfig);
  return provider.list(storageConfig.path + "/");
}

export async function restoreBackup(backupKey: string): Promise<void> {
  const storageConfig = await getBackupStorageConfig();
  if (!storageConfig) throw new Error("Backup storage not configured");

  const provider = createProvider(storageConfig);
  const tarBuffer = await provider.download(backupKey);

  const entries = readTarEntries(tarBuffer);

  const manifestEntry = entries.find(e => e.name === "manifest.json");
  if (!manifestEntry) throw new Error("Invalid backup: missing manifest");

  const dbEntry = entries.find(e => e.name === "database.db");
  if (!dbEntry) throw new Error("Invalid backup: missing database");

  await prisma.$disconnect();

  const dbPath = getDbPath();
  writeFileSync(dbPath, dbEntry.data);

  const uploadsDir = getUploadsDir();
  mkdirSync(uploadsDir, { recursive: true });

  for (const entry of entries) {
    if (entry.name.startsWith("uploads/") && entry.name !== "uploads/") {
      const filename = entry.name.replace("uploads/", "");
      writeFileSync(join(uploadsDir, filename), entry.data);
    }
  }
}

export async function applyRetention(): Promise<number> {
  const config = await prisma.backupConfig.findUnique({ where: { id: "default" } });
  if (!config?.retentionDays || config.retentionDays <= 0) return 0;

  const storageConfig = await getBackupStorageConfig();
  if (!storageConfig) return 0;

  const provider = createProvider(storageConfig);
  const files = await provider.list(storageConfig.path + "/");
  const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);

  let deleted = 0;
  for (const file of files) {
    if (file.lastModified < cutoff) {
      await provider.delete(file.key);
      deleted++;
    }
  }
  return deleted;
}
