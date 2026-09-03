import { NextResponse } from "next/server";
import { requireParent } from "@/lib/api-helpers";
import { listBackups } from "@/lib/backup";

export async function GET() {
  const { error } = await requireParent();
  if (error) return error;

  try {
    const backups = await listBackups();
    return NextResponse.json(backups);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to list backups: ${message}` },
      { status: 500 }
    );
  }
}
