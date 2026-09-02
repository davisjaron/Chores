import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";
import { todayString } from "@/lib/utils";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (childId) where.childId = childId;
  if (status) where.status = status;

  const assignments = await prisma.choreAssignment.findMany({
    where,
    include: { child: true, chore: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const { childId, choreId, points, cashValue } = body;

  if (!childId || !choreId) {
    return NextResponse.json({ error: "childId and choreId required" }, { status: 400 });
  }

  const assignment = await prisma.choreAssignment.create({
    data: {
      childId,
      choreId,
      date: todayString(),
      points: points != null && points !== "" ? Number(points) : null,
      cashValue: cashValue != null && cashValue !== "" ? Number(cashValue) : null,
      status: "pending",
    },
    include: { child: true, chore: true },
  });

  return NextResponse.json(assignment);
}
