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
  const existing = await prisma.redemption.findUnique({
    where: { id: params.id },
    include: { reward: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "approved") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can approve" }, { status: 403 });
    }
    const redemption = await prisma.redemption.update({
      where: { id: params.id },
      data: { status: "approved" },
      include: { child: true, reward: true },
    });
    return NextResponse.json(redemption);
  }

  if (body.status === "rejected") {
    if (session!.user.role !== "parent") {
      return NextResponse.json({ error: "Only parents can reject" }, { status: 403 });
    }
    await prisma.redemption.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.redemption.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
