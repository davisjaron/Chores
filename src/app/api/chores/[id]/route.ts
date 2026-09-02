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
  const chore = await prisma.chore.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      emoji: body.emoji || null,
      photo: body.photo || null,
      active: body.active ?? true,
      allowConcurrent: body.allowConcurrent ?? false,
      minAge: body.minAge != null && body.minAge !== "" ? Number(body.minAge) : null,
      maxAge: body.maxAge != null && body.maxAge !== "" ? Number(body.maxAge) : null,
      points: body.points != null ? Number(body.points) : 1,
      cashValue: body.cashValue != null && body.cashValue !== "" ? Number(body.cashValue) : null,
      maxClaimsPerDay:
        body.maxClaimsPerDay != null && body.maxClaimsPerDay !== ""
          ? Number(body.maxClaimsPerDay)
          : null,
      maxClaimsPerWeek:
        body.maxClaimsPerWeek != null && body.maxClaimsPerWeek !== ""
          ? Number(body.maxClaimsPerWeek)
          : null,
      maxConsecutivePerKid:
        body.maxConsecutivePerKid != null && body.maxConsecutivePerKid !== ""
          ? Number(body.maxConsecutivePerKid)
          : null,
      maxTotalPerDay:
        body.maxTotalPerDay != null && body.maxTotalPerDay !== ""
          ? Number(body.maxTotalPerDay)
          : null,
      maxTotalPerWeek:
        body.maxTotalPerWeek != null && body.maxTotalPerWeek !== ""
          ? Number(body.maxTotalPerWeek)
          : null,
    },
  });

  return NextResponse.json(chore);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.chore.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
