export type ProviderStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "UNAVAILABLE"
  | "ERROR"
  | "AUTH_REQUIRED"
  | "DATA_UNAVAILABLE";

export type MetricKind =
  | "session_limit"
  | "weekly_limit"
  | "monthly_limit"
  | "context"
  | "tokens"
  | "requests"
  | "premium_requests"
  | "credits";

/**
 * One measurement a provider really exposes. Providers only emit the metrics
 * they can actually measure; the HUD never fabricates missing ones.
 */
export interface UsageMetric {
  id: string;
  kind: MetricKind;
  label: string;
  /** 0-100. Either supplied directly or derived from used/limit. */
  percent?: number;
  used?: number;
  limit?: number;
  /** Unix epoch seconds when the window resets. */
  resetsAt?: number;
}

export type Activity = "active" | "idle" | "unknown";

export interface UsageData {
  providerId: string;
  providerName: string;
  metrics: UsageMetric[];
  model?: string;
  status: ProviderStatus;
  /** Human readable reason when status is not CONNECTED. */
  message?: string;
  activity: Activity;
  /** Unix epoch milliseconds of the last successful read. */
  lastUpdated?: number;
}

export interface ProviderBrand {
  /** Identification color. Placeholder unless the brand guidelines allow otherwise. */
  color: string;
  officialUrl: string;
  docsUrl: string;
  /** Whether the official logo is bundled. False = generic glyph is used. */
  officialLogo: boolean;
}

export interface Detection {
  /** The tool exists on this machine. Says nothing about authentication. */
  installed: boolean;
  connected: boolean;
}

export interface UsageProvider {
  id: string;
  name: string;
  /** Short glyph used by ProviderIcon when no official logo is bundled. */
  icon: string;
  brand: ProviderBrand;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<ProviderStatus>;
  getUsage(): Promise<UsageData>;
  isAvailable(): Promise<boolean>;
}
