import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const childId =
    session!.user.role === "kid" ? session!.user.childId! : searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  const [claims, redemptions, cashTransactions] = await Promise.all([
    prisma.claim.findMany({
      where: { childId, status: { in: ["approved", "complete"] } },
      include: { chore: true },
      orderBy: { claimedDate: "desc" },
    }),
    prisma.redemption.findMany({
      where: { childId, status: "approved" },
      include: { reward: true },
      orderBy: { date: "desc" },
    }),
    prisma.cashTransaction.findMany({
      where: { childId, kind: { in: ["cashout", "adjustment"] } },
      orderBy: { date: "desc" },
    }),
  ]);

  type PointsEvent = { id: string; date: string; kind: string; source: string; points: number; note: string };
  const events: PointsEvent[] = [];

  for (const c of claims) {
    if (c.points && c.points > 0) {
      events.push({
        id: c.id,
        date: c.completedDate || c.claimedDate,
        kind: "chore_earned",
        source: "claim",
        points: c.points,
        note: c.chore.name,
      });
    }
  }

  for (const r of redemptions) {
    events.push({
      id: r.id,
      date: r.date,
      kind: "reward_redeemed",
      source: "redemption",
      points: -r.pointsSpent,
      note: r.reward.name,
    });
  }

  for (const t of cashTransactions) {
    if (t.kind === "cashout" && t.points) {
      events.push({
        id: t.id,
        date: t.date,
        kind: "cashout",
        source: "cashTransaction",
        points: -t.points,
        note: t.note || "Cashed out",
      });
    }
    if (t.kind === "adjustment" && t.points) {
      events.push({
        id: t.id,
        date: t.date,
        kind: "adjustment",
        source: "cashTransaction",
        points: t.points,
        note: t.note || "Manual adjustment",
      });
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json(events);
}
