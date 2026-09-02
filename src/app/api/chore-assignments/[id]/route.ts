import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.choreAssignment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
