// Dashboard numbers, computed from receipts. "Wasted" = paid calls later rated useless or refund-worthy.
import { readdirSync, readFileSync } from "node:fs";
import { SERVICES } from "./catalog.js";

const DATA = process.env.MANDATE_DATA ?? "data";
const PRICE = Object.fromEntries(SERVICES.map((s) => [s.service, s.price]));

export function listReceipts() {
  let files = [];
  try {
    files = readdirSync(`${DATA}/receipts`).filter((f) => f.endsWith(".json"));
  } catch {}
  return files
    .map((f) => JSON.parse(readFileSync(`${DATA}/receipts/${f}`, "utf8")))
    .map((r) => ({ ...r, startedAt: r.steps?.[0]?.at ?? null }))
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
}

export function valueStats() {
  const receipts = listReceipts().filter((r) => r.task?.type !== "unknown");
  const services = {};
  const tasks = receipts.map((r) => {
    const spent = r.payments.reduce((s, p) => s + p.amount, 0);
    let wasted = 0;
    for (const p of r.payments) {
      const rating = r.ratings?.[p.service]?.rating;
      const s = (services[p.service] ??= { service: p.service, price: PRICE[p.service], calls: 0, useful: 0, useless: 0, unrated: 0, spent: 0, skipped: 0 });
      s.calls += 1;
      s.spent += p.amount;
      if (rating === "useful") s.useful += 1;
      else if (rating) {
        s.useless += 1;
        wasted += p.amount;
      } else s.unrated += 1;
    }
    for (const k of r.skipped) {
      (services[k.service] ??= { service: k.service, price: PRICE[k.service], calls: 0, useful: 0, useless: 0, unrated: 0, spent: 0, skipped: 0 }).skipped += 1;
    }
    // What the same task would have cost with memory OFF: every planned service paid.
    const memoryOffCost = r.plan.reduce((s, svc) => s + (PRICE[svc] ?? 0), 0);
    return {
      taskId: r.taskId,
      at: r.startedAt,
      type: r.task.type,
      useMemory: r.useMemory,
      spent,
      wasted,
      memoryOffCost,
      skipped: r.skipped.map((k) => k.service),
      rated: Boolean(r.ratings),
    };
  });
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  const on = tasks.filter((t) => t.useMemory);
  return {
    tasks,
    services: Object.values(services).map((s) => ({
      ...s,
      usefulRate: s.useful + s.useless ? s.useful / (s.useful + s.useless) : null,
      costPerUseful: s.useful ? Math.round(s.spent / s.useful) : null,
    })),
    totals: {
      tasks: tasks.length,
      spent: sum(tasks, (t) => t.spent),
      wasted: sum(tasks, (t) => t.wasted),
      memoryOnSpent: sum(on, (t) => t.spent),
      memoryOnWouldHaveCost: sum(on, (t) => t.memoryOffCost),
      denied: sum(receipts, (r) => r.denied.length),
    },
  };
}
