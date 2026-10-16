import type { UsageData, UsageProvider } from "../types/usage";
import { formatAgo } from "../utils/time";
import { MetricBar } from "./MetricBar";
import { ProviderIcon } from "./ProviderIcon";

const ACTIVITY_LABEL = { active: "● Active", idle: "○ Idle", unknown: "○ Not running" } as const;

/** Adaptive body: renders only the metrics the provider really supplied. */
export function ProviderDetails({
  provider,
  data,
  now,
  showHeader = true,
}: {
  provider: UsageProvider;
  data: UsageData | undefined;
  now: number;
  showHeader?: boolean;
}) {
  return (
    <div className="details">
      {showHeader && (
        <div className="details-head">
          <ProviderIcon provider={provider} size={18} />
          <strong>{provider.name}</strong>
          {data && <span className="activity">{ACTIVITY_LABEL[data.activity]}</span>}
        </div>
      )}
      {!data && <div className="note">Loading…</div>}
      {data && data.metrics.map((m) => <MetricBar key={m.id} metric={m} now={now} />)}
      {data && data.metrics.length === 0 && (
        <div className="note">
          {data.status === "ERROR" ? `${provider.name} unavailable` : "Data unavailable"}
          {data.message && <div className="note-sub">{data.message}</div>}
        </div>
      )}
      {data?.model && (
        <div className="kv">
          <span>Model</span>
          <span>{data.model}</span>
        </div>
      )}
      {data?.lastUpdated !== undefined && (
        <div className="kv">
          <span>Updated</span>
          <span>{formatAgo(data.lastUpdated, now)}</span>
        </div>
      )}
    </div>
  );
}
