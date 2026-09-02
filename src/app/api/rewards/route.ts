import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const rewards = await prisma.reward.findMany({ orderBy: { pointCost: "asc" } });
  return NextResponse.json(rewards);
}

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const reward = await prisma.reward.create({
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
