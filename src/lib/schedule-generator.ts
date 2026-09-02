import { addDays, format, parseISO } from "date-fns";
import type { Child, Chore } from "@prisma/client";
import { isChoreAgeAppropriate } from "./utils";

export type AssignmentInput = {
  date: string;
  childId: string;
  choreId: string;
  status: string;
};

type GenerateOptions = {
  startDate: string;
  endDate: string;
  allowSameDay: boolean;
  children: Child[];
  chores: Chore[];
  unavailableDates: { childId: string; date: string }[];
};

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);
  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return dates;
}

export function generateSchedule(options: GenerateOptions): AssignmentInput[] {
  const {
    startDate,
    endDate,
    allowSameDay,
    children,
    chores,
    unavailableDates,
  } = options;

  const activeChildren = children.filter((c) => c.active);
  const activeChores = chores.filter((c) => c.active);
  if (activeChildren.length === 0 || activeChores.length === 0) return [];

  const unavailableSet = new Set(
    unavailableDates.map((u) => `${u.childId}:${u.date}`)
  );

  const lastChoreIndex: Record<string, number> = {};
  activeChildren.forEach((child) => {
    lastChoreIndex[child.id] = -1;
  });

  const assignments: AssignmentInput[] = [];
  const dates = dateRange(startDate, endDate);

  dates.forEach((date, dayIndex) => {
    const choresUsedToday = new Set<string>();

    activeChildren.forEach((child, childIndex) => {
      if (unavailableSet.has(`${child.id}:${date}`)) return;
      if ((dayIndex + childIndex) % 2 !== 0) return;

      const eligibleChores = activeChores.filter((chore) =>
        isChoreAgeAppropriate(child.age, chore.minAge, chore.maxAge)
      );
      if (eligibleChores.length === 0) return;

      let picked: Chore | null = null;
      const startIdx = (lastChoreIndex[child.id] + 1) % eligibleChores.length;

      for (let offset = 0; offset < eligibleChores.length; offset++) {
        const idx = (startIdx + offset) % eligibleChores.length;
        const chore = eligibleChores[idx];
        const sameDayBlocked =
          choresUsedToday.has(chore.id) &&
          !allowSameDay &&
          !chore.allowConcurrent;
        if (!sameDayBlocked) {
          picked = chore;
          lastChoreIndex[child.id] = idx;
          break;
        }
      }

      if (!picked) {
        picked = eligibleChores[startIdx % eligibleChores.length];
        lastChoreIndex[child.id] = startIdx % eligibleChores.length;
      }

      choresUsedToday.add(picked.id);
      assignments.push({
        date,
        childId: child.id,
        choreId: picked.id,
        status: "pending",
      });
    });
  });

  return assignments;
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const date = parseISO(dateStr);
  date.setMonth(date.getMonth() + months);
  return format(date, "yyyy-MM-dd");
}
