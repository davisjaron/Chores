export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/backup/scheduler");
    setTimeout(() => {
      startScheduler().catch((err) => {
        console.error("[backup] Failed to start scheduler:", err);
      });
    }, 5000);
  }
}
