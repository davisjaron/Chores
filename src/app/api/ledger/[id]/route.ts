import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const existing = await prisma.ledgerEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.ledgerEntry.update({
    where: { id: params.id },
    data: {
      ...(body.date !== undefined && { date: body.date }),
      ...(body.amount !== undefined && { amount: Number(body.amount) }),
      ...(body.note !== undefined && { note: body.note || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const existing = await prisma.ledgerEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ledgerEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
