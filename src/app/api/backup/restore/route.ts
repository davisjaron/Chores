import { NextResponse } from "next/server";
import { requireParent } from "@/lib/api-helpers";
import { restoreBackup } from "@/lib/backup";

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  if (!body.key) {
    return NextResponse.json({ error: "Backup key is required" }, { status: 400 });
  }

  try {
    await restoreBackup(body.key);
    return NextResponse.json({
      success: true,
      message: "Backup restored successfully. The application should be restarted.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Restore failed: ${message}` },
      { status: 500 }
    );
  }
}
