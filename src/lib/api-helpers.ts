import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireParent() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (session!.user.role !== "parent") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export async function getSettings() {
  const { prisma } = await import("./prisma");
  let settings = await prisma.scheduleSetting.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    const { todayString } = await import("./utils");
    settings = await prisma.scheduleSetting.create({
      data: {
        id: "default",
        startDate: todayString(),
        mode: "claim",
      },
    });
  }
  return settings;
}
