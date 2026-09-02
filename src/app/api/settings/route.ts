import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent, getSettings } from "@/lib/api-helpers";
import { calculateBalances } from "@/lib/points-calculator";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const settings = await prisma.scheduleSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      startDate: body.startDate,
      endDate: body.endDate || null,
      allowSameDay: body.allowSameDay ?? false,
      mode: body.mode || "claim",
      cashPerPoint:
        body.cashPerPoint != null && body.cashPerPoint !== ""
          ? Number(body.cashPerPoint)
          : null,
      themeColor: body.themeColor || "violet",
      requireAssignedFirst: body.requireAssignedFirst ?? false,
      timezone: body.timezone || "America/Chicago",
    },
    update: {
      startDate: body.startDate,
      endDate: body.endDate || null,
      allowSameDay: body.allowSameDay ?? false,
      mode: body.mode || "claim",
      cashPerPoint:
        body.cashPerPoint != null && body.cashPerPoint !== ""
          ? Number(body.cashPerPoint)
          : null,
      themeColor: body.themeColor || "violet",
      requireAssignedFirst: body.requireAssignedFirst ?? false,
      timezone: body.timezone || "America/Chicago",
    },
  });

  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") !== "balances") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const body = await request.json();
  const childId =
    session!.user.role === "kid" ? session!.user.childId! : body.childId;

  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  const [claims, redemptions, cashTransactions, ledgerEntries, settings] = await Promise.all([
    prisma.claim.findMany({ where: { childId } }),
    prisma.redemption.findMany({ where: { childId } }),
    prisma.cashTransaction.findMany({ where: { childId } }),
    prisma.ledgerEntry.findMany({ where: { childId } }),
    getSettings(),
  ]);

  const balances = calculateBalances(claims, redemptions, cashTransactions, ledgerEntries);
  return NextResponse.json({ ...balances, cashPerPoint: settings.cashPerPoint });
}
