import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { generateIcs } from "@/lib/ics-export";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") !== "false";
  const includeSkipped = searchParams.get("includeSkipped") === "true";

  const assignments = await prisma.assignment.findMany({
    include: { child: true, chore: true },
    orderBy: { date: "asc" },
  });

  const ics = generateIcs(
    assignments as Parameters<typeof generateIcs>[0],
    includeCompleted,
    includeSkipped
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="chore-schedule.ics"',
    },
  });
}
