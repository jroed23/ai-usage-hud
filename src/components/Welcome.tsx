import { useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { useHudStore } from "../stores/hudStore";
import { ProviderIcon } from "./ProviderIcon";

export function Welcome() {
  const { providers, connect, updateSettings } = useHudStore();
  const [selected, setSelected] = useState<string[]>(providers.map((p) => p.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((i) => i !== id) : [...s, id]));

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const id of selected) await connect(id);
    } catch (e) {
      setError(typeof e === "string" ? e : "Could not connect. You can retry in Settings.");
    }
    await updateSettings({ onboarded: true, enabledProviders: selected });
    await emit("settings-changed");
    setBusy(false);
  };

  return (
    <div className="welcome">
      <h1>Welcome to AI Usage HUD</h1>
      <p className="sub">Choose the AI services you want to monitor</p>
      <div className="choices">
        {providers.map((p) => (
          <label key={p.id} className={selected.includes(p.id) ? "choice on" : "choice"}>
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => toggle(p.id)}
            />
            <ProviderIcon provider={p} size={28} />
            <span>{p.name}</span>
          </label>
        ))}
      </div>
      <p className="hint">
        Connecting Claude registers this app as your Claude Code status line (a backup of
        ~/.claude/settings.json is kept, and any existing status line keeps working). Only usage
        numbers are read.
      </p>
      {error && <div className="error">{error}</div>}
      <button className="btn primary" disabled={busy || selected.length === 0} onClick={next}>
        {busy ? "Connecting…" : "Continue"}
      </button>
      <p className="hint">Independent open-source project, not affiliated with any provider.</p>
    </div>
  );
}
