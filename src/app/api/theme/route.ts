import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.scheduleSetting.findUnique({
    where: { id: "default" },
    select: { themeColor: true, mode: true },
  });

  return NextResponse.json({ themeColor: settings?.themeColor || "violet", mode: settings?.mode || "claim" });
}
