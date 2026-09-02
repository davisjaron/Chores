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
  const reward = await prisma.reward.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      pointCost: Number(body.pointCost),
      emoji: body.emoji || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(reward);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.reward.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
