import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function POST() {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.ledgerEntry.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.choreAssignment.deleteMany();

  return NextResponse.json({ success: true });
}
