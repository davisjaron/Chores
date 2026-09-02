import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { calculateBalances } from "@/lib/points-calculator";
import { getSettings } from "@/lib/api-helpers";
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

  const transactions = await prisma.cashTransaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const childId =
    session!.user.role === "kid" ? session!.user.childId! : body.childId;
  const { kind, points, amount, note } = body;

  if (!childId || !kind) {
    return NextResponse.json({ error: "childId and kind required" }, { status: 400 });
  }

  const settings = await getSettings();

  if (session!.user.role === "kid" && childId !== session!.user.childId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (kind === "cashout") {
    if (!settings.cashPerPoint) {
      return NextResponse.json({ error: "Cash per point not configured" }, { status: 400 });
    }

    const pts = Number(points);
    if (!pts || pts <= 0) {
      return NextResponse.json({ error: "Invalid points amount" }, { status: 400 });
    }

    const [claims, redemptions, cashTransactions, ledgerEntries] = await Promise.all([
      prisma.claim.findMany({ where: { childId } }),
      prisma.redemption.findMany({ where: { childId } }),
      prisma.cashTransaction.findMany({ where: { childId } }),
      prisma.ledgerEntry.findMany({ where: { childId } }),
    ]);

    const balances = calculateBalances(claims, redemptions, cashTransactions, ledgerEntries);
    if (balances.pointsBalance < pts) {
      return NextResponse.json({ error: "Not enough points" }, { status: 400 });
    }

    const cashAmount = pts * settings.cashPerPoint;
    const transaction = await prisma.cashTransaction.create({
      data: {
        childId,
        date: todayString(settings.timezone),
        kind: "cashout",
        points: pts,
        amount: cashAmount,
        note: note || null,
      },
    });

    return NextResponse.json(transaction);
  }

  if (kind === "payment") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can record payments" }, { status: 403 });
    }
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        childId,
        date: todayString(settings.timezone),
        kind: "payment",
        amount: -Math.abs(payAmount),
        note: note || null,
      },
    });

    return NextResponse.json(transaction);
  }

  if (kind === "adjustment") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can make adjustments" }, { status: 403 });
    }

    const adjPoints = points != null ? Number(points) : null;
    const adjAmount = amount != null ? Number(amount) : 0;

    const transaction = await prisma.cashTransaction.create({
      data: {
        childId,
        date: todayString(settings.timezone),
        kind: "adjustment",
        points: adjPoints || null,
        amount: adjAmount,
        note: note || "Manual adjustment",
      },
    });

    return NextResponse.json(transaction);
  }

  return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
}
