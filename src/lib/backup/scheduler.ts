import { prisma } from "../prisma";
import { createBackup, applyRetention } from "./engine";

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

function getNextBackupTime(dailyTime: string, timezone: string): Date {
  const [hours, minutes] = dailyTime.split(":").map(Number);
  const now = new Date();

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const [currentHours, currentMinutes] = timeStr.split(":").map(Number);
  const currentMinutesOfDay = currentHours * 60 + currentMinutes;
  const targetMinutesOfDay = hours * 60 + minutes;

  const diffMinutes = targetMinutesOfDay > currentMinutesOfDay
    ? targetMinutesOfDay - currentMinutesOfDay
    : (1440 - currentMinutesOfDay) + targetMinutesOfDay;

  return new Date(now.getTime() + diffMinutes * 60 * 1000);
}

async function runScheduledBackup() {
  if (isRunning) return;
  isRunning = true;

  try {
    await createBackup();
    await applyRetention();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await prisma.backupConfig.update({
        where: { id: "default" },
        data: {
          lastBackupAt: new Date().toISOString(),
          lastBackupStatus: "failed",
          lastBackupError: message.slice(0, 500),
        },
      });
    } catch {}
    console.error("[backup] Scheduled backup failed:", message);
  } finally {
    isRunning = false;
  }

  scheduleNext();
}

async function scheduleNext() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  try {
    const config = await prisma.backupConfig.findUnique({ where: { id: "default" } });
    if (!config?.enabled || !config.bucket) return;

    const settings = await prisma.scheduleSetting.findUnique({ where: { id: "default" } });
    const timezone = settings?.timezone || "America/Chicago";

    const next = getNextBackupTime(config.dailyBackupTime || "02:00", timezone);
    const delay = Math.max(next.getTime() - Date.now(), 60000);

    await prisma.backupConfig.update({
      where: { id: "default" },
      data: { nextBackupAt: next.toISOString() },
    });

    schedulerTimer = setTimeout(runScheduledBackup, delay);
  } catch (err) {
    console.error("[backup] Failed to schedule next backup:", err);
    schedulerTimer = setTimeout(() => scheduleNext(), 5 * 60 * 1000);
  }
}

export async function startScheduler() {
  await scheduleNext();
}

export async function restartScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  await scheduleNext();
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}

export function isBackupRunning() {
  return isRunning;
}
