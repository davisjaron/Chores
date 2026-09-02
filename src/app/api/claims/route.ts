import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getSettings } from "@/lib/api-helpers";
import { checkChoreRateLimits } from "@/lib/rate-limiter";
import { todayString, isChoreAgeAppropriate } from "@/lib/utils";

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

  const claims = await prisma.claim.findMany({
    where,
    include: { child: true, chore: true },
    orderBy: { claimedDate: "desc" },
  });

  return NextResponse.json(claims);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const childId =
    session!.user.role === "kid" ? session!.user.childId! : body.childId;
  const choreId = body.choreId;
  const settings = await getSettings();
  const claimedDate = body.claimedDate || todayString(settings.timezone);
  const choreAssignmentId = body.choreAssignmentId || null;

  if (!childId || !choreId) {
    return NextResponse.json({ error: "childId and choreId required" }, { status: 400 });
  }

  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore || !chore.active) {
    return NextResponse.json({ error: "Chore not available" }, { status: 400 });
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 400 });
  }

  if (!isChoreAgeAppropriate(child.age, chore.minAge, chore.maxAge)) {
    return NextResponse.json({ error: "This chore is not available for your age" }, { status: 400 });
  }

  let assignedByParent = false;
  let assignmentPoints = chore.points;
  let assignmentCash = chore.cashValue;

  if (choreAssignmentId) {
    const assignment = await prisma.choreAssignment.findUnique({
      where: { id: choreAssignmentId },
    });
    if (assignment && assignment.childId === childId && assignment.choreId === choreId) {
      assignedByParent = true;
      if (assignment.points != null) assignmentPoints = assignment.points;
      if (assignment.cashValue != null) assignmentCash = assignment.cashValue;
      await prisma.choreAssignment.update({
        where: { id: choreAssignmentId },
        data: { status: "claimed" },
      });
    }
  }

  if (!assignedByParent) {
    if (settings.requireAssignedFirst) {
      const pendingAssignments = await prisma.choreAssignment.findMany({
        where: {
          childId,
          status: { in: ["pending", "claimed"] },
        },
      });
      if (pendingAssignments.length > 0) {
        return NextResponse.json(
          { error: "Complete your assigned chores first before picking up new ones" },
          { status: 400 }
        );
      }
    }
  }

  const activeClaim = await prisma.claim.findFirst({
    where: { childId, choreId, status: "claimed" },
  });
  if (activeClaim) {
    return NextResponse.json({ error: "You already have this chore in progress" }, { status: 400 });
  }

  const pendingToday = await prisma.claim.findFirst({
    where: { childId, choreId, status: "pending_approval", claimedDate: claimedDate },
  });
  if (pendingToday) {
    return NextResponse.json({ error: "Already awaiting approval for this chore today" }, { status: 400 });
  }

  const allClaims = await prisma.claim.findMany();
  const rateCheck = checkChoreRateLimits(chore, childId, claimedDate, allClaims);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 400 });
  }

  const claim = await prisma.claim.create({
    data: {
      childId,
      choreId,
      claimedDate,
      status: "claimed",
      points: assignmentPoints,
      cashAwarded: assignmentCash,
      assignedByParent,
      choreAssignmentId,
    },
    include: { child: true, chore: true },
  });

  return NextResponse.json(claim);
}
