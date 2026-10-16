import type { SavedPosition } from "../../utils/position";

export type ViewMode = "minimal" | "compact" | "detailed" | "expanded";
export type Theme = "dark" | "light" | "system";

/** Non-secret preferences only. Credentials never go through here. */
export interface Settings {
  onboarded: boolean;
  enabledProviders: string[];
  viewMode: ViewMode;
  theme: Theme;
  alwaysOnTop: boolean;
  /** 0.3 - 1 */
  opacity: number;
  /** 0.8 - 1.4 */
  scale: number;
  animations: boolean;
  refreshSeconds: number;
  position?: SavedPosition;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  enabledProviders: [],
  viewMode: "compact",
  theme: "dark",
  alwaysOnTop: true,
  opacity: 0.92,
  scale: 1,
  animations: true,
  refreshSeconds: 10,
};

export interface KeyValueStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, unknown>();
  async get<T>(key: string) {
    return this.data.get(key) as T | undefined;
  }
  async set(key: string, value: unknown) {
    this.data.set(key, value);
  }
}

const KEY = "settings";

function sanitize(raw: Partial<Settings> | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  s.opacity = Math.min(1, Math.max(0.3, num(s.opacity, DEFAULT_SETTINGS.opacity)));
  s.scale = Math.min(1.4, Math.max(0.8, num(s.scale, 1)));
  s.refreshSeconds = Math.min(300, Math.max(2, Math.round(num(s.refreshSeconds, 10))));
  s.enabledProviders = Array.isArray(s.enabledProviders) ? s.enabledProviders : [];
  return s;
}

export async function loadSettings(storage: KeyValueStorage): Promise<Settings> {
  try {
    return sanitize(await storage.get<Partial<Settings>>(KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(storage: KeyValueStorage, settings: Settings): Promise<void> {
  await storage.set(KEY, sanitize(settings));
}

export { sanitize as sanitizeSettings };

/** Persistent store backed by tauri-plugin-store (a JSON file in the app data dir). */
export async function createTauriStorage(): Promise<KeyValueStorage> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load("settings.json");
  return {
    get: async <T>(key: string) => (await store.get<T>(key)) ?? undefined,
    set: async (key, value) => {
      await store.set(key, value);
      await store.save();
    },
  };
}
