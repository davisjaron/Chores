import { NextResponse } from "next/server";
import { requireParent } from "@/lib/api-helpers";
import { createBackup, applyRetention, isBackupRunning } from "@/lib/backup";

export async function POST() {
  const { error } = await requireParent();
  if (error) return error;

  if (isBackupRunning()) {
    return NextResponse.json(
      { error: "A backup is already in progress" },
      { status: 409 }
    );
  }

  try {
    const result = await createBackup();
    await applyRetention();
    return NextResponse.json({
      success: true,
      filename: result.filename,
      size: result.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Backup failed: ${message}` },
      { status: 500 }
    );
  }
}
