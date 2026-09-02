import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const { session, error } = await requireParent();
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
