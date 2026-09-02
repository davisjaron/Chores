import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent, getSettings } from "@/lib/api-helpers";
import { todayString } from "@/lib/utils";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");

  const where: Record<string, unknown> = {};
  if (session!.user.role === "kid") {
    where.childId = session!.user.childId;
  } else if (childId) {
    where.childId = childId;
  }

  const entries = await prisma.ledgerEntry.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const { childId, kind, amount, note, date } = body;

  if (!childId || !kind || amount == null) {
    return NextResponse.json({ error: "childId, kind, and amount required" }, { status: 400 });
  }

  const validKinds = ["deposit", "withdrawal", "chore_earning"];
  if (!validKinds.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const settings = await getSettings();
  const entry = await prisma.ledgerEntry.create({
    data: {
      childId,
      date: date || todayString(settings.timezone),
      kind,
      amount: Number(amount),
      note: note || null,
    },
  });

  return NextResponse.json(entry);
}
