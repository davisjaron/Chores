import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const childId = searchParams.get("childId");

  const where: Record<string, unknown> = {};
  if (start && end) {
    where.date = { gte: start, lte: end };
  }
  if (session!.user.role === "kid") {
    where.childId = session!.user.childId;
  } else if (childId) {
    where.childId = childId;
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: { child: true, chore: true },
    orderBy: [{ date: "asc" }, { child: { name: "asc" } }],
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const assignment = await prisma.assignment.create({
    data: {
      date: body.date,
      childId: body.childId,
      choreId: body.choreId,
      status: body.status || "pending",
    },
    include: { child: true, chore: true },
  });

  return NextResponse.json(assignment);
}
