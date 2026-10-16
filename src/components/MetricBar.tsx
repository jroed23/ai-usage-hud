import type { UsageMetric } from "../types/usage";
import { formatCompact, levelFor, metricPercent } from "../utils/percent";
import { formatReset } from "../utils/time";

export function MetricBar({ metric, now }: { metric: UsageMetric; now: number }) {
  const percent = metricPercent(metric);
  const reset = formatReset(metric.resetsAt, now);
  return (
    <div className="metric">
      <div className="metric-row">
        <span className="metric-label">{metric.label}</span>
        <span className="metric-value">
          {percent === undefined ? "—" : `${Math.round(percent)}%`}
        </span>
      </div>
      {percent !== undefined && (
        <div className="bar">
          <div
            className={`bar-fill lvl-${levelFor(percent)}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <div className="metric-sub">
        {metric.used !== undefined && metric.limit !== undefined && (
          <span>
            {formatCompact(metric.used)} / {formatCompact(metric.limit)}
          </span>
        )}
        {reset && <span>Resets {reset}</span>}
      </div>
    </div>
  );
}
