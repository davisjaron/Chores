import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import type { Chore } from "@prisma/client";

export type RateLimitClaim = {
  id: string;
  childId: string;
  choreId: string;
  status: string;
  claimedDate: string;
  completedDate?: string | null;
};

export type RateLimitResult = {
  allowed: boolean;
  reason?: string;
};

export function getWeekRange(dateStr: string) {
  const date = parseISO(dateStr);
  const start = format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const end = format(endOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
  return { start, end };
}

export function checkChoreRateLimits(
  chore: Chore,
  childId: string,
  claimedDate: string,
  allClaims: RateLimitClaim[]
): RateLimitResult {
  const activeClaims = allClaims.filter((c) => c.status !== "abandoned" && c.status !== "rejected");

  const choreDayClaims = activeClaims.filter(
    (c) => c.choreId === chore.id && c.claimedDate === claimedDate
  );

  if (chore.maxTotalPerDay != null) {
    if (choreDayClaims.length >= chore.maxTotalPerDay) {
      return {
        allowed: false,
        reason: `This chore has been claimed ${chore.maxTotalPerDay} time${chore.maxTotalPerDay === 1 ? "" : "s"} today — no more spots`,
      };
    }
  }

  if (chore.maxTotalPerWeek != null) {
    const { start, end } = getWeekRange(claimedDate);
    const totalWeekCount = activeClaims.filter(
      (c) =>
        c.choreId === chore.id &&
        c.claimedDate >= start &&
        c.claimedDate <= end
    ).length;
    if (totalWeekCount >= chore.maxTotalPerWeek) {
      return {
        allowed: false,
        reason: `This chore has been claimed ${chore.maxTotalPerWeek} time${chore.maxTotalPerWeek === 1 ? "" : "s"} this week — no more spots`,
      };
    }
  }

  if (chore.maxClaimsPerDay != null) {
    const kidDayCount = choreDayClaims.filter((c) => c.childId === childId).length;
    if (kidDayCount >= chore.maxClaimsPerDay) {
      return {
        allowed: false,
        reason: `You've already done this chore ${chore.maxClaimsPerDay} time${chore.maxClaimsPerDay === 1 ? "" : "s"} today`,
      };
    }
  }

  if (chore.maxClaimsPerWeek != null) {
    const { start, end } = getWeekRange(claimedDate);
    const kidWeekCount = activeClaims.filter(
      (c) =>
        c.choreId === chore.id &&
        c.childId === childId &&
        c.claimedDate >= start &&
        c.claimedDate <= end
    ).length;
    if (kidWeekCount >= chore.maxClaimsPerWeek) {
      return {
        allowed: false,
        reason: `You've already done this chore ${chore.maxClaimsPerWeek} time${chore.maxClaimsPerWeek === 1 ? "" : "s"} this week`,
      };
    }
  }

  if (chore.maxConsecutivePerKid != null && chore.maxConsecutivePerKid > 0) {
    const kidClaims = activeClaims
      .filter((c) => c.childId === childId && (c.status === "complete" || c.status === "approved"))
      .sort((a, b) => {
        const aDate = a.completedDate || a.claimedDate;
        const bDate = b.completedDate || b.claimedDate;
        return bDate.localeCompare(aDate);
      });

    const recent = kidClaims.slice(0, chore.maxConsecutivePerKid);
    if (
      recent.length >= chore.maxConsecutivePerKid &&
      recent.every((c) => c.choreId === chore.id)
    ) {
      return {
        allowed: false,
        reason: `You've done this chore ${chore.maxConsecutivePerKid} times in a row — try a different one!`,
      };
    }
  }

  return { allowed: true };
}

export function isChoreAtLimit(
  chore: Chore,
  childId: string,
  claimedDate: string,
  allClaims: RateLimitClaim[]
) {
  return !checkChoreRateLimits(chore, childId, claimedDate, allClaims).allowed;
}
