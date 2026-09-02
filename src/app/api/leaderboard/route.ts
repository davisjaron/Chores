import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export const dynamic = "force-dynamic";

function dateRangeForPeriod(period: string) {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "daily":
      start = startOfDay(now);
      break;
    case "weekly":
      start = startOfWeek(now, { weekStartsOn: 0 });
      break;
    case "monthly":
      start = startOfMonth(now);
      break;
    case "yearly":
      start = startOfYear(now);
      break;
    default:
      start = startOfWeek(now, { weekStartsOn: 0 });
  }

  return format(start, "yyyy-MM-dd");
}

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "weekly";

  const startDate = dateRangeForPeriod(period);

  const children = await prisma.child.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const claims = await prisma.claim.findMany({
    where: {
      status: { in: ["approved", "complete"] },
      completedDate: { gte: startDate },
    },
  });

  const leaderboard = children.map((child) => {
    const childClaims = claims.filter((c) => c.childId === child.id);
    const totalPoints = childClaims.reduce((sum, c) => sum + (c.points || 0), 0);
    const totalCash = childClaims.reduce((sum, c) => sum + (c.cashAwarded || 0), 0);
    const choreCount = childClaims.length;

    return {
      childId: child.id,
      name: child.name,
      color: child.color,
      emoji: child.emoji,
      totalPoints,
      totalCash,
      choreCount,
    };
  });

  const byPoints = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  const byCash = [...leaderboard].sort((a, b) => b.totalCash - a.totalCash);
  const byChores = [...leaderboard].sort((a, b) => b.choreCount - a.choreCount);

  return NextResponse.json({
    period,
    startDate,
    byPoints,
    byCash,
    byChores,
  });
}
