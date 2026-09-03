import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";
import { encrypt, restartScheduler } from "@/lib/backup";

export async function GET() {
  const { error } = await requireParent();
  if (error) return error;

  const config = await prisma.backupConfig.findUnique({ where: { id: "default" } });
  if (!config) {
    return NextResponse.json({
      provider: "s3",
      enabled: false,
      endpoint: "",
      region: "",
      bucket: "",
      path: "chores-backups",
      accessKey: "",
      secretKey: "",
      dailyBackupTime: "02:00",
      retentionDays: 30,
      lastBackupAt: null,
      lastBackupStatus: null,
      lastBackupError: null,
      lastBackupFile: null,
      nextBackupAt: null,
    });
  }

  return NextResponse.json({
    provider: config.provider,
    enabled: config.enabled,
    endpoint: config.endpoint || "",
    region: config.region || "",
    bucket: config.bucket || "",
    path: config.path,
    accessKey: config.accessKeyEncrypted ? "••••••••" : "",
    secretKey: config.secretKeyEncrypted ? "••••••••" : "",
    dailyBackupTime: config.dailyBackupTime,
    retentionDays: config.retentionDays,
    lastBackupAt: config.lastBackupAt,
    lastBackupStatus: config.lastBackupStatus,
    lastBackupError: config.lastBackupError,
    lastBackupFile: config.lastBackupFile,
    nextBackupAt: config.nextBackupAt,
  });
}

export async function PUT(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();

  const existing = await prisma.backupConfig.findUnique({ where: { id: "default" } });

  const accessKeyChanged = body.accessKey && body.accessKey !== "••••••••";
  const secretKeyChanged = body.secretKey && body.secretKey !== "••••••••";

  const data = {
    provider: body.provider || "s3",
    enabled: body.enabled ?? false,
    endpoint: body.endpoint || null,
    region: body.region || null,
    bucket: body.bucket || null,
    path: body.path || "chores-backups",
    dailyBackupTime: body.dailyBackupTime || "02:00",
    retentionDays: body.retentionDays != null ? Number(body.retentionDays) : 30,
    accessKeyEncrypted: accessKeyChanged
      ? encrypt(body.accessKey)
      : existing?.accessKeyEncrypted || null,
    secretKeyEncrypted: secretKeyChanged
      ? encrypt(body.secretKey)
      : existing?.secretKeyEncrypted || null,
  };

  await prisma.backupConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  await restartScheduler();

  return NextResponse.json({ success: true });
}
