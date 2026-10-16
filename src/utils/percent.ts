import type { UsageMetric } from "../types/usage";

/** Clamp to 0-100; returns undefined for non-finite input (never a fake 0). */
export function clampPercent(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

export function computePercent(used?: number, limit?: number): number | undefined {
  if (used === undefined || limit === undefined || !(limit > 0)) return undefined;
  return clampPercent((used / limit) * 100);
}

export function metricPercent(m: UsageMetric): number | undefined {
  return clampPercent(m.percent) ?? computePercent(m.used, m.limit);
}

export type Level = "ok" | "warn" | "high" | "critical";

export function levelFor(percent: number): Level {
  if (percent >= 90) return "critical";
  if (percent >= 75) return "high";
  if (percent >= 50) return "warn";
  return "ok";
}

/** 1250 -> "1.3K", 300000 -> "300K", 1_400_000 -> "1.4M". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return String(Math.round(n));
}

function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}
