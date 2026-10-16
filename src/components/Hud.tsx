import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNow } from "../hooks/useNow";
import { useAutoSize, usePersistedPosition } from "../hooks/useHudWindow";
import { useHudStore } from "../stores/hudStore";
import type { UsageData, UsageProvider } from "../types/usage";
import { levelFor, metricPercent } from "../utils/percent";
import { formatAgo } from "../utils/time";
import { ProviderDetails } from "./ProviderDetails";
import { ProviderIcon } from "./ProviderIcon";

/** The number shown next to the icon: session limit first, else the first metric with a percent. */
function primaryPercent(data?: UsageData): number | undefined {
  if (!data) return undefined;
  const ordered = [...data.metrics].sort(
    (a, b) => Number(b.kind === "session_limit") - Number(a.kind === "session_limit"),
  );
  for (const m of ordered) {
    const p = metricPercent(m);
    if (p !== undefined) return p;
  }
  return undefined;
}

function dotFor(data?: UsageData) {
  if (!data || data.status !== "CONNECTED") return "off" as const;
  return data.activity === "active" ? ("active" as const) : ("idle" as const);
}

export function Hud() {
  const { ready, settings, usage, providers, init, reloadSettings, refresh, updateSettings } =
    useHudStore();
  const rootRef = useRef<HTMLDivElement>(null);
  // Provider whose details panel is open (toggled by clicking its icon).
  const [opened, setOpened] = useState<string | null>(null);
  const press = useRef<{ x: number; y: number } | null>(null);

  const visible = useMemo(
    () => providers.filter((p) => settings.enabledProviders.includes(p.id)),
    [providers, settings.enabledProviders],
  );

  useEffect(() => {
    void init();
  }, [init]);

  // Tray "Refresh", and settings changes made in the other window.
  useEffect(() => {
    const subs = [
      listen("refresh", () => void refresh(true)),
      listen("settings-changed", () => void reloadSettings()),
    ];
    return () => subs.forEach((p) => void p.then((off) => off()));
  }, [refresh, reloadSettings]);

  // Smart polling: a cheap local file read at the configured interval.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => void refresh(false), settings.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [ready, settings.refreshSeconds, refresh]);

  useEffect(() => {
    if (ready) void getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop);
  }, [ready, settings.alwaysOnTop]);

  useEffect(() => {
    if (ready && !settings.onboarded) void invoke("open_settings");
  }, [ready, settings.onboarded]);

  usePersistedPosition(ready, settings.position, (position) => void updateSettings({ position }));

  const popup = settings.viewMode === "minimal" || settings.viewMode === "compact";
  const needsClock = settings.viewMode === "expanded" || (popup && opened !== null);
  const now = useNow(needsClock);

  useAutoSize(rootRef, [
    settings.viewMode,
    settings.scale,
    visible.length,
    opened,
    usage,
    ready,
  ]);

  // A press that moves more than a few px becomes a window drag; a press that
  // does not move stays a click (startDragging swallows the click otherwise).
  const onDown = (e: MouseEvent) => {
    if (e.button === 0) press.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: MouseEvent) => {
    const p = press.current;
    if (!p || !(e.buttons & 1)) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) {
      press.current = null;
      void getCurrentWindow().startDragging();
    }
  };
  const onUp = () => {
    press.current = null;
  };

  const style = {
    "--bg-alpha": settings.opacity,
    zoom: settings.scale,
  } as React.CSSProperties;

  const openProvider = visible.find((p) => p.id === opened);

  return (
    <div
      ref={rootRef}
      className={`hud theme-${settings.theme} mode-${settings.viewMode} ${settings.animations ? "anim" : ""}`}
      style={style}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ready && visible.length === 0 && (
        <button className="chip chip-empty" onClick={() => void invoke("open_settings")}>
          AI
        </button>
      )}

      {visible.length > 0 && settings.viewMode === "expanded" && (
        <div className="panel">
          <div className="panel-title">AI USAGE</div>
          {visible.map((p) => (
            <ProviderDetails key={p.id} provider={p} data={usage[p.id]} now={now} />
          ))}
          <div className="panel-foot">
            Updated {formatAgo(latest(Object.values(usage)), now)}
          </div>
        </div>
      )}

      {visible.length > 0 && settings.viewMode === "detailed" && (
        <div className="panel">
          {visible.map((p) => (
            <ProviderDetails key={p.id} provider={p} data={usage[p.id]} now={now} />
          ))}
        </div>
      )}

      {visible.length > 0 && popup && (
        <>
          <div className="chips">
            {visible.map((p) => (
              <Chip
                key={p.id}
                provider={p}
                data={usage[p.id]}
                showPercent={settings.viewMode === "compact"}
                onClick={() => setOpened((cur) => (cur === p.id ? null : p.id))}
              />
            ))}
          </div>
          {openProvider && (
            <div className="panel open-panel">
              <ProviderDetails
                provider={openProvider}
                data={usage[openProvider.id]}
                now={now}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function latest(all: UsageData[]): number | undefined {
  const times = all.map((d) => d.lastUpdated).filter((t): t is number => t !== undefined);
  return times.length ? Math.max(...times) : undefined;
}

function Chip({
  provider,
  data,
  showPercent,
  onClick,
}: {
  provider: UsageProvider;
  data?: UsageData;
  showPercent: boolean;
  onClick: () => void;
}) {
  const percent = primaryPercent(data);
  return (
    <div className="chip" onClick={onClick}>
      <ProviderIcon provider={provider} dot={dotFor(data)} />
      {showPercent && (
        <span className={percent === undefined ? "pct pct-na" : `pct lvl-${levelFor(percent)}`}>
          {percent === undefined ? "—" : `${Math.round(percent)}%`}
        </span>
      )}
    </div>
  );
}
