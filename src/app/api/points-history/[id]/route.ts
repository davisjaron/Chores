import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const { source, date, points, note } = body;

  if (source === "claim") {
    const existing = await prisma.claim.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.claim.update({
      where: { id: params.id },
      data: {
        ...(date !== undefined && { completedDate: date, claimedDate: date }),
        ...(points !== undefined && { points: Number(points) }),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (source === "redemption") {
    const existing = await prisma.redemption.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.redemption.update({
      where: { id: params.id },
      data: {
        ...(date !== undefined && { date }),
        ...(points !== undefined && { pointsSpent: Math.abs(Number(points)) }),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (source === "cashTransaction") {
    const existing = await prisma.cashTransaction.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.cashTransaction.update({
      where: { id: params.id },
      data: {
        ...(date !== undefined && { date }),
        ...(points !== undefined && { points: Math.abs(Number(points)) }),
        ...(note !== undefined && { note }),
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  if (source === "claim") {
    await prisma.claim.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  if (source === "redemption") {
    await prisma.redemption.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  if (source === "cashTransaction") {
    await prisma.cashTransaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}
