import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const { date, reason } = await request.json();
  const unavailable = await prisma.unavailableDate.create({
    data: {
      childId: params.id,
      date,
      reason: reason || null,
    },
  });

  return NextResponse.json(unavailable);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const unavailableId = searchParams.get("unavailableId");
  if (!unavailableId) {
    return NextResponse.json({ error: "unavailableId required" }, { status: 400 });
  }

  await prisma.unavailableDate.delete({
    where: { id: unavailableId, childId: params.id },
  });

  return NextResponse.json({ success: true });
}
