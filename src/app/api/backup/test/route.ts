import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";
import { decrypt, createProvider } from "@/lib/backup";

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();

  const existing = await prisma.backupConfig.findUnique({ where: { id: "default" } });

  const accessKey = body.accessKey && body.accessKey !== "••••••••"
    ? body.accessKey
    : existing?.accessKeyEncrypted ? decrypt(existing.accessKeyEncrypted) : null;
  const secretKey = body.secretKey && body.secretKey !== "••••••••"
    ? body.secretKey
    : existing?.secretKeyEncrypted ? decrypt(existing.secretKeyEncrypted) : null;

  if (!body.bucket || !accessKey || !secretKey) {
    return NextResponse.json(
      { error: "Bucket, access key, and secret key are required" },
      { status: 400 }
    );
  }

  try {
    const provider = createProvider({
      provider: body.provider || "s3",
      endpoint: body.endpoint || null,
      region: body.region || null,
      bucket: body.bucket,
      path: body.path || "chores-backups",
      accessKey,
      secretKey,
    });

    await provider.testConnection();
    return NextResponse.json({ success: true, message: "Connection successful" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Connection failed: ${message}` },
      { status: 400 }
    );
  }
}
