import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getSettings } from "@/lib/api-helpers";
import { calculateBalances } from "@/lib/points-calculator";
import { todayString } from "@/lib/utils";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (session!.user.role === "kid") {
    where.childId = session!.user.childId;
  } else if (childId) {
    where.childId = childId;
  }
  if (status) {
    where.status = status;
  }

  const redemptions = await prisma.redemption.findMany({
    where,
    include: { child: true, reward: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(redemptions);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const childId =
    session!.user.role === "kid" ? session!.user.childId! : body.childId;
  const rewardId = body.rewardId;

  if (!childId || !rewardId) {
    return NextResponse.json({ error: "childId and rewardId required" }, { status: 400 });
  }

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.active) {
    return NextResponse.json({ error: "Reward not available" }, { status: 400 });
  }

  const [claims, redemptions, cashTransactions, ledgerEntries] = await Promise.all([
    prisma.claim.findMany({ where: { childId } }),
    prisma.redemption.findMany({ where: { childId } }),
    prisma.cashTransaction.findMany({ where: { childId } }),
    prisma.ledgerEntry.findMany({ where: { childId } }),
  ]);

  const balances = calculateBalances(claims, redemptions, cashTransactions, ledgerEntries);
  if (balances.pointsBalance < reward.pointCost) {
    return NextResponse.json({ error: "Not enough points" }, { status: 400 });
  }

  const settings = await getSettings();
  const redemption = await prisma.redemption.create({
    data: {
      childId,
      rewardId,
      date: todayString(settings.timezone),
      pointsSpent: reward.pointCost,
      status: "pending_approval",
    },
    include: { child: true, reward: true },
  });

  return NextResponse.json(redemption);
}
