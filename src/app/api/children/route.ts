import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const children = await prisma.child.findMany({
    include: { unavailableDates: true },
    orderBy: { name: "asc" },
  });

  const sanitized = children.map((child) => ({
    ...child,
    pin: undefined,
    hasPin: !!child.pin,
    ...(session!.user.role === "parent" ? {} : {}),
  }));

  return NextResponse.json(sanitized);
}

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const body = await request.json();
  const { name, color, emoji, age, active, pin } = body;

  let hashedPin: string | null = null;
  if (pin) {
    hashedPin = await bcrypt.hash(String(pin), 10);
  }

  const child = await prisma.child.create({
    data: {
      name,
      color: color || null,
      emoji: emoji || null,
      age: age != null ? Number(age) : null,
      active: active ?? true,
      pin: hashedPin,
    },
    include: { unavailableDates: true },
  });

  return NextResponse.json({ ...child, pin: undefined, hasPin: !!child.pin });
}
