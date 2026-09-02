import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getSettings } from "@/lib/api-helpers";
import { todayString } from "@/lib/utils";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const [existing, settings] = await Promise.all([
    prisma.claim.findUnique({ where: { id: params.id }, include: { chore: true } }),
    getSettings(),
  ]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const today = todayString(settings.timezone);

  if (session!.user.role === "kid" && existing.childId !== session!.user.childId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.status === "pending_approval") {
    if (session!.user.role === "kid" && existing.status !== "claimed") {
      return NextResponse.json({ error: "Can only submit claimed chores" }, { status: 400 });
    }
    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: {
        status: "pending_approval",
        completedDate: today,
      },
      include: { child: true, chore: true },
    });
    return NextResponse.json(claim);
  }

  if (body.status === "approved") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can approve" }, { status: 403 });
    }
    const pts = existing.points ?? existing.chore.points;
    const cash = existing.cashAwarded ?? existing.chore.cashValue;
    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: {
        status: "approved",
        points: pts,
        cashAwarded: cash,
      },
      include: { child: true, chore: true },
    });
    if (cash && cash > 0) {
      await prisma.ledgerEntry.create({
        data: {
          childId: existing.childId,
          date: today,
          kind: "chore_earning",
          amount: cash,
          note: `Chore: ${existing.chore.name}`,
        },
      });
    }
    if (existing.choreAssignmentId) {
      await prisma.choreAssignment.update({
        where: { id: existing.choreAssignmentId },
        data: { status: "completed" },
      }).catch(() => {});
    }
    return NextResponse.json(claim);
  }

  if (body.status === "rejected") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can reject" }, { status: 403 });
    }
    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: {
        status: "claimed",
        completedDate: null,
      },
      include: { child: true, chore: true },
    });
    return NextResponse.json(claim);
  }

  if (body.status === "complete") {
    if (session!.user.role === "parent") {
      const pts = existing.points ?? existing.chore.points;
      const cash = existing.cashAwarded ?? existing.chore.cashValue;
      const claim = await prisma.claim.update({
        where: { id: params.id },
        data: {
          status: "approved",
          completedDate: today,
          points: pts,
          cashAwarded: cash,
        },
        include: { child: true, chore: true },
      });
      if (cash && cash > 0) {
        await prisma.ledgerEntry.create({
          data: {
            childId: existing.childId,
            date: today,
            kind: "chore_earning",
            amount: cash,
            note: `Chore: ${existing.chore.name}`,
          },
        });
      }
      if (existing.choreAssignmentId) {
        await prisma.choreAssignment.update({
          where: { id: existing.choreAssignmentId },
          data: { status: "completed" },
        }).catch(() => {});
      }
      return NextResponse.json(claim);
    }
    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: {
        status: "pending_approval",
        completedDate: today,
      },
      include: { child: true, chore: true },
    });
    return NextResponse.json(claim);
  }

  if (body.status === "unapproved") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can unapprove" }, { status: 403 });
    }
    if (existing.status !== "approved") {
      return NextResponse.json({ error: "Can only unapprove approved claims" }, { status: 400 });
    }
    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: {
        status: "pending_approval",
        points: 0,
        cashAwarded: 0,
      },
      include: { child: true, chore: true },
    });
    if (existing.chore.cashValue && existing.chore.cashValue > 0) {
      const ledgerEntry = await prisma.ledgerEntry.findFirst({
        where: {
          childId: existing.childId,
          kind: "chore_earning",
          amount: existing.chore.cashValue,
          note: `Chore: ${existing.chore.name}`,
        },
        orderBy: { date: "desc" },
      });
      if (ledgerEntry) {
        await prisma.ledgerEntry.delete({ where: { id: ledgerEntry.id } });
      }
    }
    return NextResponse.json(claim);
  }

  if (body.status === "abandoned") {
    await prisma.claim.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const existing = await prisma.claim.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session!.user.role === "kid") {
    if (existing.childId !== session!.user.childId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status === "approved" || existing.status === "complete") {
      return NextResponse.json({ error: "Cannot delete approved claims" }, { status: 403 });
    }
  }

  await prisma.claim.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
