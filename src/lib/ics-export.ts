import { addDays, format, parseISO } from "date-fns";
import type { Assignment, Child, Chore } from "@prisma/client";

type AssignmentWithRelations = Assignment & {
  child: Pick<Child, "name">;
  chore: Pick<Chore, "name" | "description">;
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function statusToIcs(status: string) {
  if (status === "complete") return "COMPLETED";
  if (status === "skipped") return "CANCELLED";
  return "CONFIRMED";
}

export function generateIcs(
  assignments: AssignmentWithRelations[],
  includeCompleted = true,
  includeSkipped = false
) {
  const filtered = assignments.filter((a) => {
    if (a.status === "complete") return includeCompleted;
    if (a.status === "skipped") return includeSkipped;
    return true;
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chore Chart//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  filtered.forEach((assignment) => {
    const start = parseISO(assignment.date);
    const end = addDays(start, 1);
    const dtStart = format(start, "yyyyMMdd");
    const dtEnd = format(end, "yyyyMMdd");
    const summary = escapeIcsText(
      `${assignment.child.name}: ${assignment.chore.name}`
    );
    const description = escapeIcsText(assignment.chore.description || "");
    const categories = escapeIcsText(assignment.child.name);
    const uid = `chore-${assignment.id}@chorechart`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push(`CATEGORIES:${categories}`);
    lines.push(`STATUS:${statusToIcs(assignment.status)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
