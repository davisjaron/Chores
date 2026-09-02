import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const children = await prisma.child.findMany({
    where: { active: true },
    select: { id: true, name: true, color: true, emoji: true, pin: true, active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    children.map((c: { id: string; name: string; color: string | null; emoji: string | null; active: boolean; pin: string | null }) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      emoji: c.emoji,
      active: c.active,
      hasPin: !!c.pin,
    }))
  );
}
