import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { getSettings } from "@/lib/api-helpers";
import { calculateBalances } from "@/lib/points-calculator";
import { todayString } from "@/lib/utils";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const settings = await getSettings();
  const today = todayString(settings.timezone);
  const upcomingEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const assignmentWhere: Record<string, unknown> = {
    date: { gte: today, lte: upcomingEnd },
  };
  if (session!.user.role === "kid") {
    assignmentWhere.childId = session!.user.childId;
  }

  const [todayAssignments, upcomingAssignments, recentAssignments, children, claims, pendingApprovals] =
    await Promise.all([
      prisma.assignment.findMany({
        where: {
          date: today,
          ...(session!.user.role === "kid" ? { childId: session!.user.childId } : {}),
        },
        include: { child: true, chore: true },
        orderBy: { child: { name: "asc" } },
      }),
      prisma.assignment.findMany({
        where: assignmentWhere,
        include: { child: true, chore: true },
        orderBy: { date: "asc" },
      }),
      prisma.assignment.findMany({
        where: {
          status: "complete",
          ...(session!.user.role === "kid" ? { childId: session!.user.childId } : {}),
        },
        include: { child: true, chore: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.child.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.claim.findMany({
        where: {
          status: { in: ["approved", "complete"] },
          ...(session!.user.role === "kid" ? { childId: session!.user.childId } : {}),
        },
        include: { child: true, chore: true },
        orderBy: { completedDate: "desc" },
        take: 10,
      }),
      session!.user.role === "parent"
        ? prisma.claim.findMany({
            where: { status: "pending_approval" },
            include: { child: true, chore: true },
            orderBy: { completedDate: "asc" },
          })
        : Promise.resolve([]),
    ]);

  const pendingRedemptions = session!.user.role === "parent"
    ? await prisma.redemption.findMany({
        where: { status: "pending_approval" },
        include: { child: true, reward: true },
        orderBy: { date: "asc" },
      })
    : [];

  const childBalances: Record<string, ReturnType<typeof calculateBalances>> = {};
  if (settings.mode === "claim" && session!.user.role === "parent") {
    for (const child of children) {
      const [cClaims, redemptions, cashTransactions, ledgerEntries] = await Promise.all([
        prisma.claim.findMany({ where: { childId: child.id } }),
        prisma.redemption.findMany({ where: { childId: child.id } }),
        prisma.cashTransaction.findMany({ where: { childId: child.id } }),
        prisma.ledgerEntry.findMany({ where: { childId: child.id } }),
      ]);
      childBalances[child.id] = calculateBalances(cClaims, redemptions, cashTransactions, ledgerEntries);
    }
  } else if (settings.mode === "claim" && session!.user.role === "kid") {
    const childId = session!.user.childId!;
    const [cClaims, redemptions, cashTransactions, ledgerEntries] = await Promise.all([
      prisma.claim.findMany({ where: { childId } }),
      prisma.redemption.findMany({ where: { childId } }),
      prisma.cashTransaction.findMany({ where: { childId } }),
      prisma.ledgerEntry.findMany({ where: { childId } }),
    ]);
    childBalances[childId] = calculateBalances(cClaims, redemptions, cashTransactions, ledgerEntries);
  }

  return NextResponse.json({
    settings,
    todayAssignments,
    upcomingAssignments,
    recentAssignments,
    recentClaims: claims,
    pendingApprovals,
    pendingRedemptions,
    children,
    childBalances,
  });
}
