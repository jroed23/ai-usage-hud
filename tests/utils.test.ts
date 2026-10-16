import { describe, expect, it } from "vitest";
import { clampPercent, computePercent, formatCompact, levelFor, metricPercent } from "../src/utils/percent";
import { formatAgo, formatReset } from "../src/utils/time";
import { resolvePosition } from "../src/utils/position";

describe("percent", () => {
  it("never invents values", () => {
    expect(clampPercent(undefined)).toBeUndefined();
    expect(clampPercent(NaN)).toBeUndefined();
    expect(computePercent(5, 0)).toBeUndefined();
    expect(computePercent(undefined, 10)).toBeUndefined();
  });
  it("clamps and computes", () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-3)).toBe(0);
    expect(computePercent(245, 500)).toBeCloseTo(49);
    expect(metricPercent({ id: "a", kind: "requests", label: "R", used: 250, limit: 500 })).toBe(50);
    expect(metricPercent({ id: "a", kind: "session_limit", label: "S", percent: 42 })).toBe(42);
  });
  it("maps levels", () => {
    expect(levelFor(10)).toBe("ok");
    expect(levelFor(50)).toBe("warn");
    expect(levelFor(75)).toBe("high");
    expect(levelFor(90)).toBe("critical");
  });
  it("formats compact numbers", () => {
    expect(formatCompact(125_000)).toBe("125K");
    expect(formatCompact(1_400_000)).toBe("1.4M");
    expect(formatCompact(42)).toBe("42");
  });
});

describe("time", () => {
  it("formats ago", () => {
    expect(formatAgo(undefined)).toBe("never");
    expect(formatAgo(1000, 9000)).toBe("8s ago");
    expect(formatAgo(0, 3 * 60_000)).toBe("3m ago");
  });
  it("formats reset", () => {
    expect(formatReset(undefined)).toBeUndefined();
    expect(formatReset(0, 10_000)).toBe("now");
    expect(formatReset(3 * 3600 + 600, 0)).toBe("in 3h 10m");
    expect(formatReset(2 * 86400 + 4 * 3600, 0)).toBe("in 2d 4h");
  });
});

describe("multi-monitor position", () => {
  const m1 = { name: "A", x: 0, y: 0, width: 1920, height: 1080 };
  const m2 = { name: "B", x: 1920, y: 0, width: 1920, height: 1080 };
  const size = { width: 100, height: 50 };

  it("keeps a valid saved position", () => {
    expect(resolvePosition({ x: 2000, y: 100 }, [m1, m2], size)).toEqual({ x: 2000, y: 100 });
  });
  it("relocates when the saved monitor is gone", () => {
    const p = resolvePosition({ monitor: "B", x: 2000, y: 100 }, [m1], size);
    expect(p.x).toBeLessThan(1920);
    expect(p.x).toBeGreaterThanOrEqual(0);
  });
  it("clamps a window hanging off the edge", () => {
    expect(resolvePosition({ x: 1900, y: 1070 }, [m1], size)).toEqual({ x: 1820, y: 1030 });
  });
  it("uses a default corner without saved data", () => {
    expect(resolvePosition(undefined, [m1], size)).toEqual({ x: 1920 - 100 - 24, y: 24 });
  });
});
