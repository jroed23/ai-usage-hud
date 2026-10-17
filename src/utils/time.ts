/** "8s ago", "3m ago", "2h ago". `now` is injectable for tests. */
export function formatAgo(timestampMs: number | undefined, now = Date.now()): string {
  if (timestampMs === undefined) return "never";
  const s = Math.max(0, Math.round((now - timestampMs) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Time until reset: "in 2h 10m", "in 3d 4h", "now". */
export function formatReset(resetsAtSec: number | undefined, nowMs = Date.now()): string | undefined {
  if (resetsAtSec === undefined) return undefined;
  const s = Math.round(resetsAtSec - nowMs / 1000);
  if (s <= 0) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `in ${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d}d ${h % 24}h`;
}

/** Data older than this is shown greyed out: it may no longer match the real usage. */
export const STALE_AFTER_MS = 5 * 60 * 1000;

export function isStale(lastUpdatedMs: number | undefined, now = Date.now()): boolean {
  return lastUpdatedMs !== undefined && now - lastUpdatedMs > STALE_AFTER_MS;
}
