import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const existing = await prisma.assignment.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session!.user.role === "kid" && existing.childId !== session!.user.childId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session!.user.role === "kid" && body.status) {
    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: { status: body.status },
      include: { child: true, chore: true },
    });
    return NextResponse.json(assignment);
  }

  if (session!.user.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.assignment.update({
    where: { id: params.id },
    data: {
      date: body.date,
      childId: body.childId,
      choreId: body.choreId,
      status: body.status,
    },
    include: { child: true, chore: true },
  });

  return NextResponse.json(assignment);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.assignment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
