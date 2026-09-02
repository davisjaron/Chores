import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { secret } = await request.json();
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";

  const oldUser = await prisma.user.findUnique({ where: { email: "parent@family.com" } });
  if (oldUser) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.update({
      where: { id: oldUser.id },
      data: { email: "admin", password: hashed, name: "Admin" },
    });
    return NextResponse.json({ success: true, message: "Migrated parent@family.com to admin" });
  }

  const adminUser = await prisma.user.findUnique({ where: { email: "admin" } });
  if (adminUser) {
    return NextResponse.json({ success: true, message: "Admin user already exists" });
  }

  const hashed = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: { email: "admin", password: hashed, name: "Admin" },
  });
  return NextResponse.json({ success: true, message: "Created admin user" });
}
