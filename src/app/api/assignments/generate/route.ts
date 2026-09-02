import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/api-helpers";
import { generateSchedule } from "@/lib/schedule-generator";

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const { startDate, endDate, allowSameDay } = await request.json();
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }

  const [children, chores, unavailableDates] = await Promise.all([
    prisma.child.findMany(),
    prisma.chore.findMany(),
    prisma.unavailableDate.findMany(),
  ]);

  const assignments = generateSchedule({
    startDate,
    endDate,
    allowSameDay: !!allowSameDay,
    children,
    chores,
    unavailableDates,
  });

  await prisma.$transaction([
    prisma.assignment.deleteMany(),
    prisma.scheduleSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        startDate,
        endDate,
        allowSameDay: !!allowSameDay,
      },
      update: {
        startDate,
        endDate,
        allowSameDay: !!allowSameDay,
      },
    }),
  ]);

  const chunkSize = 400;
  for (let i = 0; i < assignments.length; i += chunkSize) {
    await prisma.assignment.createMany({
      data: assignments.slice(i, i + chunkSize),
    });
  }

  return NextResponse.json({ count: assignments.length });
}
