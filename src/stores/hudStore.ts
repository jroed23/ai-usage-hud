import { create } from "zustand";
import { createDefaultRegistry } from "../providers";
import { UsageService } from "../services/usage/UsageService";
import {
  DEFAULT_SETTINGS,
  createTauriStorage,
  loadSettings,
  saveSettings,
  sanitizeSettings,
  type KeyValueStorage,
  type Settings,
} from "../services/storage/settings";
import type { UsageData, UsageProvider } from "../types/usage";

export const registry = createDefaultRegistry();
export const usageService = new UsageService(registry, { ttlMs: 2_000 });

let storage: KeyValueStorage | undefined;

interface HudState {
  ready: boolean;
  settings: Settings;
  usage: Record<string, UsageData>;
  providers: UsageProvider[];
  init(): Promise<void>;
  /** Re-read settings from disk (another window changed them). */
  reloadSettings(): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  refresh(force?: boolean): Promise<void>;
  connect(id: string): Promise<void>;
  disconnect(id: string): Promise<void>;
}

export const useHudStore = create<HudState>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  usage: {},
  providers: registry.list(),

  async init() {
    storage ??= await createTauriStorage();
    const settings = await loadSettings(storage);
    usageService.setEnabled(settings.enabledProviders);
    usageService.subscribe((usage) => set({ usage }));
    set({ settings, ready: true });
    await get().refresh(true);
  },

  async reloadSettings() {
    if (!storage) return;
    const settings = await loadSettings(storage);
    usageService.setEnabled(settings.enabledProviders);
    set({ settings });
    await get().refresh(true);
  },

  async updateSettings(patch) {
    const settings = sanitizeSettings({ ...get().settings, ...patch });
    set({ settings });
    if (patch.enabledProviders) usageService.setEnabled(settings.enabledProviders);
    if (storage) await saveSettings(storage, settings);
  },

  async refresh(force = false) {
    await usageService.refresh(force);
  },

  async connect(id) {
    try {
      await usageService.connect(id);
    } finally {
      const s = get().settings;
      if (!s.enabledProviders.includes(id)) {
        await get().updateSettings({ enabledProviders: [...s.enabledProviders, id] });
      }
    }
  },

  async disconnect(id) {
    await usageService.disconnect(id);
  },
}));
