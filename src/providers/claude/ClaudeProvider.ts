import type {
  Detection,
  ProviderStatus,
  UsageData,
  UsageMetric,
  UsageProvider,
} from "../../types/usage";
import { claudeBrand } from "./brand";

/** Sanitized data written by the Rust status line relay (usage fields only). */
export interface ClaudeSnapshot {
  /** Unix epoch seconds. */
  updatedAt: number;
  model: string | null;
  fiveHour: { usedPercentage: number; resetsAt: number | null } | null;
  sevenDay: { usedPercentage: number; resetsAt: number | null } | null;
  contextUsedPercentage: number | null;
  contextWindowSize: number | null;
}

/** Everything the provider needs from the host. Mocked in tests. */
export interface ClaudeBackend {
  snapshot(): Promise<ClaudeSnapshot | null>;
  detect(): Promise<Detection>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/** A status line update newer than this means Claude Code is being used right now. */
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Reads usage through Claude Code's official status line mechanism
 * (https://code.claude.com/docs/en/statusline). No private APIs, tokens or
 * conversation content are involved.
 */
export class ClaudeProvider implements UsageProvider {
  readonly id = "claude";
  readonly name = "Claude";
  readonly icon = "C";
  readonly brand = claudeBrand;

  constructor(
    private readonly backend: ClaudeBackend,
    private readonly now: () => number = Date.now,
  ) {}

  connect(): Promise<void> {
    return this.backend.connect();
  }

  disconnect(): Promise<void> {
    return this.backend.disconnect();
  }

  async isAvailable(): Promise<boolean> {
    return (await this.backend.detect()).installed;
  }

  async getStatus(): Promise<ProviderStatus> {
    return (await this.getUsage()).status;
  }

  async getUsage(): Promise<UsageData> {
    const base = { providerId: this.id, providerName: this.name };
    const detection = await this.backend.detect();

    if (!detection.installed && !detection.connected) {
      return {
        ...base,
        metrics: [],
        status: "UNAVAILABLE",
        message: "Claude Code was not detected on this computer.",
        activity: "unknown",
      };
    }
    if (!detection.connected) {
      return {
        ...base,
        metrics: [],
        status: "DISCONNECTED",
        message: "Connect to start reading Claude Code usage.",
        activity: "unknown",
      };
    }

    const snap = await this.backend.snapshot();
    if (!snap) {
      return {
        ...base,
        metrics: [],
        status: "DATA_UNAVAILABLE",
        message: "Waiting for the first Claude Code response.",
        activity: "unknown",
      };
    }

    const nowMs = this.now();
    const lastUpdated = snap.updatedAt * 1000;
    const metrics = this.toMetrics(snap, nowMs);
    const activity = nowMs - lastUpdated < ACTIVE_WINDOW_MS ? "active" : "idle";

    if (metrics.length === 0) {
      return {
        ...base,
        metrics,
        model: snap.model ?? undefined,
        status: "DATA_UNAVAILABLE",
        message:
          "Claude Code did not report usage limits (they require a Claude Pro or Max subscription).",
        activity,
        lastUpdated,
      };
    }
    return {
      ...base,
      metrics,
      model: snap.model ?? undefined,
      status: "CONNECTED",
      activity,
      lastUpdated,
    };
  }

  private toMetrics(snap: ClaudeSnapshot, nowMs: number): UsageMetric[] {
    const out: UsageMetric[] = [];
    // A window whose reset time already passed is stale: its percentage no
    // longer describes the current window, so it is omitted rather than shown.
    const live = (w: ClaudeSnapshot["fiveHour"]) =>
      w && !(w.resetsAt !== null && w.resetsAt * 1000 <= nowMs) ? w : null;

    const five = live(snap.fiveHour);
    if (five) {
      out.push({
        id: "session",
        kind: "session_limit",
        label: "Session (5h)",
        percent: five.usedPercentage,
        resetsAt: five.resetsAt ?? undefined,
      });
    }
    const seven = live(snap.sevenDay);
    if (seven) {
      out.push({
        id: "weekly",
        kind: "weekly_limit",
        label: "Weekly",
        percent: seven.usedPercentage,
        resetsAt: seven.resetsAt ?? undefined,
      });
    }
    if (snap.contextUsedPercentage !== null) {
      out.push({
        id: "context",
        kind: "context",
        label: "Context",
        percent: snap.contextUsedPercentage,
        used:
          snap.contextWindowSize !== null
            ? Math.round((snap.contextUsedPercentage / 100) * snap.contextWindowSize)
            : undefined,
        limit: snap.contextWindowSize ?? undefined,
      });
    }
    return out;
  }
}
