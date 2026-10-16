export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedPosition {
  monitor?: string;
  x: number;
  y: number;
}

export interface MonitorInfo extends Rect {
  name?: string;
}

const MARGIN = 24;

/**
 * Returns a position that is guaranteed to be visible. If the saved monitor is
 * gone (or the saved point is off every screen) the HUD moves to the top-right
 * corner of the first monitor.
 */
export function resolvePosition(
  saved: SavedPosition | undefined,
  monitors: MonitorInfo[],
  size: { width: number; height: number },
): { x: number; y: number } {
  if (monitors.length === 0) return saved ? { x: saved.x, y: saved.y } : { x: MARGIN, y: MARGIN };

  const containing =
    (saved && monitors.find((m) => contains(m, saved.x, saved.y))) ?? undefined;

  if (containing && saved) return clampInto(containing, saved.x, saved.y, size);

  const target = monitors[0];
  return {
    x: target.x + target.width - size.width - MARGIN,
    y: target.y + MARGIN,
  };
}

function contains(m: Rect, x: number, y: number): boolean {
  return x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + m.height;
}

function clampInto(m: Rect, x: number, y: number, size: { width: number; height: number }) {
  return {
    x: Math.min(Math.max(x, m.x), Math.max(m.x, m.x + m.width - size.width)),
    y: Math.min(Math.max(y, m.y), Math.max(m.y, m.y + m.height - size.height)),
  };
}
