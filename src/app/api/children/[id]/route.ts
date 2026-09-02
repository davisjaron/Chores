import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const child = await prisma.child.findUnique({
    where: { id: params.id },
    include: { unavailableDates: true },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...child, pin: undefined, hasPin: !!child.pin });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const { name, color, emoji, age, active, pin, clearPin } = body;

  const data: Record<string, unknown> = {
    name,
    color: color || null,
    emoji: emoji || null,
    age: age != null && age !== "" ? Number(age) : null,
    active: active ?? true,
  };

  if (clearPin) {
    data.pin = null;
  } else if (pin) {
    data.pin = await bcrypt.hash(String(pin), 10);
  }

  const child = await prisma.child.update({
    where: { id: params.id },
    data,
    include: { unavailableDates: true },
  });

  return NextResponse.json({ ...child, pin: undefined, hasPin: !!child.pin });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireParent();
  if (error) return error;

  await prisma.child.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
