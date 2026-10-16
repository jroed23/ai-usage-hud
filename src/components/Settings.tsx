import { useEffect, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useHudStore } from "../stores/hudStore";
import type { Settings as SettingsT, ViewMode } from "../services/storage/settings";
import type { UsageData, UsageProvider } from "../types/usage";
import { ProviderIcon } from "./ProviderIcon";
import { Welcome } from "./Welcome";

type Tab = "general" | "appearance" | "providers" | "privacy" | "about";
const TABS: Tab[] = ["general", "appearance", "providers", "privacy", "about"];

const MODES: { id: ViewMode; label: string; hint: string }[] = [
  { id: "minimal", label: "Minimal", hint: "Icons only" },
  { id: "compact", label: "Compact", hint: "Icon + percentage" },
  { id: "detailed", label: "Detailed", hint: "Icon + metrics" },
  { id: "expanded", label: "Expanded", hint: "Full panel" },
];

const STATUS_TEXT: Record<string, string> = {
  CONNECTED: "Connected ✓",
  CONNECTING: "Connecting…",
  DISCONNECTED: "Disconnected",
  UNAVAILABLE: "Unavailable",
  ERROR: "Error",
  AUTH_REQUIRED: "Authentication required",
  DATA_UNAVAILABLE: "Data unavailable",
};

export function SettingsWindow() {
  const { ready, settings, init, reloadSettings, refresh } = useHudStore();
  const [tab, setTab] = useState<Tab>("providers");

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const id = setInterval(() => void refresh(false), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!ready) return null;
  if (!settings.onboarded) return <Welcome />;

  return (
    <div className="settings">
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      <main className="tab-body">
        {tab === "general" && <General />}
        {tab === "appearance" && <Appearance />}
        {tab === "providers" && <Providers onChanged={() => void reloadSettings()} />}
        {tab === "privacy" && <Privacy />}
        {tab === "about" && <About />}
      </main>
    </div>
  );
}

/** Saves, then tells the HUD window to reload. */
function useChange() {
  const updateSettings = useHudStore((s) => s.updateSettings);
  return async (patch: Partial<SettingsT>) => {
    await updateSettings(patch);
    await emit("settings-changed");
  };
}

function General() {
  const { settings } = useHudStore();
  const change = useChange();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    isEnabled().then(setAuto).catch(() => undefined);
  }, []);

  const toggleAuto = async (on: boolean) => {
    try {
      await (on ? enable() : disable());
      setAuto(on);
    } catch {
      /* autostart unavailable in this environment */
    }
  };

  return (
    <section>
      <h2>General</h2>
      <label className="row">
        <span>Start with Windows</span>
        <input type="checkbox" checked={auto} onChange={(e) => void toggleAuto(e.target.checked)} />
      </label>
      <label className="row">
        <span>Always on top</span>
        <input
          type="checkbox"
          checked={settings.alwaysOnTop}
          onChange={(e) => void change({ alwaysOnTop: e.target.checked })}
        />
      </label>
      <label className="row">
        <span>Refresh every {settings.refreshSeconds}s</span>
        <input
          type="range"
          min={2}
          max={120}
          value={settings.refreshSeconds}
          onChange={(e) => void change({ refreshSeconds: Number(e.target.value) })}
        />
      </label>
      <p className="hint">
        Updates are read from a local file, so a short interval costs almost nothing. Claude Code
        itself only writes new data when it responds.
      </p>
    </section>
  );
}

function Appearance() {
  const { settings } = useHudStore();
  const change = useChange();
  return (
    <section>
      <h2>Appearance</h2>
      <div className="modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={settings.viewMode === m.id ? "mode on" : "mode"}
            onClick={() => void change({ viewMode: m.id })}
          >
            <strong>{m.label}</strong>
            <small>{m.hint}</small>
          </button>
        ))}
      </div>
      <label className="row">
        <span>Theme</span>
        <select
          value={settings.theme}
          onChange={(e) => void change({ theme: e.target.value as SettingsT["theme"] })}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className="row">
        <span>Transparency ({Math.round(settings.opacity * 100)}% opaque)</span>
        <input
          type="range"
          min={30}
          max={100}
          value={Math.round(settings.opacity * 100)}
          onChange={(e) => void change({ opacity: Number(e.target.value) / 100 })}
        />
      </label>
      <label className="row">
        <span>Size ({Math.round(settings.scale * 100)}%)</span>
        <input
          type="range"
          min={80}
          max={140}
          value={Math.round(settings.scale * 100)}
          onChange={(e) => void change({ scale: Number(e.target.value) / 100 })}
        />
      </label>
      <label className="row">
        <span>Animations</span>
        <input
          type="checkbox"
          checked={settings.animations}
          onChange={(e) => void change({ animations: e.target.checked })}
        />
      </label>
    </section>
  );
}

function Providers({ onChanged }: { onChanged: () => void }) {
  const { providers, usage, settings, connect, disconnect } = useHudStore();
  const change = useChange();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (p: UsageProvider, connecting: boolean) => {
    setBusy(p.id);
    setError(null);
    try {
      await (connecting ? connect(p.id) : disconnect(p.id));
      await emit("settings-changed");
      onChanged();
    } catch (e) {
      setError(typeof e === "string" ? e : "Could not change the connection.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <h2>Your AI Providers</h2>
      {error && <div className="error">{error}</div>}
      <div className="cards">
        {providers.map((p) => {
          const data = usage[p.id];
          const connected = data?.status === "CONNECTED" || data?.status === "DATA_UNAVAILABLE";
          const enabled = settings.enabledProviders.includes(p.id);
          return (
            <div key={p.id} className="card">
              <ProviderIcon provider={p} size={36} />
              <h3>{p.name}</h3>
              <div className={`status st-${data?.status ?? "CONNECTING"}`}>
                {STATUS_TEXT[data?.status ?? "CONNECTING"]}
              </div>
              <Checklist data={data} />
              <button
                className="btn"
                disabled={busy === p.id || data?.status === "UNAVAILABLE"}
                onClick={() => void act(p, !connected)}
              >
                {busy === p.id ? "…" : connected ? "Disconnect" : "Connect"}
              </button>
              <label className="row small">
                <span>Show in HUD</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    void change({
                      enabledProviders: e.target.checked
                        ? [...settings.enabledProviders, p.id]
                        : settings.enabledProviders.filter((i) => i !== p.id),
                    })
                  }
                />
              </label>
              {data?.message && <p className="hint">{data.message}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Checklist({ data }: { data?: UsageData }) {
  const installed = !!data && data.status !== "UNAVAILABLE";
  const connected = data?.status === "CONNECTED" || data?.status === "DATA_UNAVAILABLE";
  const items: [string, boolean][] = [
    ["Installed", installed],
    ["Connected", connected],
    ["Active", data?.activity === "active"],
    ["Usage available", (data?.metrics.length ?? 0) > 0],
  ];
  return (
    <ul className="checklist">
      {items.map(([label, ok]) => (
        <li key={label} className={ok ? "ok" : ""}>
          {ok ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
}

function Privacy() {
  return (
    <section>
      <h2>Privacy</h2>
      <ul className="plain">
        <li>Local first: no account, no server, nothing is sent anywhere.</li>
        <li>Telemetry: none. Diagnostics and logs: none are written.</li>
        <li>
          Stored from Claude Code: only the usage percentages, reset times, model name and context
          %. Never prompts, replies, file contents, paths, keys or credentials.
        </li>
        <li>Preferences live in a local settings file; no secrets are stored in it.</li>
      </ul>
    </section>
  );
}

function About() {
  return (
    <section>
      <h2>AI Usage HUD</h2>
      <p>Monitor your AI usage. Anywhere. In real time.</p>
      <p className="hint">
        Independent open-source project (MIT). Not affiliated with, endorsed by, or sponsored by
        Anthropic or any other AI provider. Names and marks belong to their owners.
      </p>
      <p className="hint">Version 0.1.0</p>
    </section>
  );
}
