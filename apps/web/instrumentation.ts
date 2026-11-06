// Background runner for recurring transfers: about once a minute, pay whatever schedules are due.
// Claiming a schedule moves its next run forward in the same database update, so if two app
// instances run this (say, local dev and the hosted app) a payment still happens only once.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SCHEDULER === "off") return;
  const g = globalThis as { __mandateScheduler?: boolean };
  if (g.__mandateScheduler) return;
  g.__mandateScheduler = true;
  const { runDueSchedules } = await import("@mandate/agent");
  const tick = () => runDueSchedules().catch((e: unknown) => console.error("[schedules]", e));
  setInterval(tick, 60_000);
  setTimeout(tick, 10_000);
}
