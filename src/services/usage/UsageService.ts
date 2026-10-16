import type { ProviderRegistry } from "../../providers/registry";
import type { UsageData, UsageProvider } from "../../types/usage";

export interface UsageServiceOptions {
  /** Reads younger than this are served from cache unless forced. */
  ttlMs?: number;
  now?: () => number;
}

type Listener = (all: Record<string, UsageData>) => void;

/**
 * Provider -> UsageService -> cache -> HUD.
 *
 * Providers fail in isolation: an exception in one becomes an ERROR entry for
 * that provider only, every other provider is still refreshed.
 */
export class UsageService {
  private readonly cache = new Map<string, { data: UsageData; fetchedAt: number }>();
  private readonly inflight = new Map<string, Promise<UsageData>>();
  private readonly listeners = new Set<Listener>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private enabled: Set<string> | null = null;

  constructor(
    private readonly registry: ProviderRegistry,
    options: UsageServiceOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? 5_000;
    this.now = options.now ?? Date.now;
  }

  /** Restrict refreshes to these provider ids (null = all registered). */
  setEnabled(ids: string[] | null): void {
    this.enabled = ids ? new Set(ids) : null;
    this.emit();
  }

  getAll(): Record<string, UsageData> {
    const out: Record<string, UsageData> = {};
    for (const p of this.active()) {
      const entry = this.cache.get(p.id);
      if (entry) out[p.id] = entry.data;
    }
    return out;
  }

  get(id: string): UsageData | undefined {
    return this.cache.get(id)?.data;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(force = false): Promise<Record<string, UsageData>> {
    await Promise.all(this.active().map((p) => this.refreshOne(p, force)));
    return this.getAll();
  }

  async connect(id: string): Promise<void> {
    await this.run(id, (p) => p.connect());
  }

  async disconnect(id: string): Promise<void> {
    await this.run(id, (p) => p.disconnect());
  }

  private async run(id: string, action: (p: UsageProvider) => Promise<void>): Promise<void> {
    const provider = this.registry.get(id);
    if (!provider) throw new Error(`Unknown provider "${id}"`);
    try {
      await action(provider);
    } finally {
      await this.refreshOne(provider, true);
    }
  }

  private active(): UsageProvider[] {
    const all = this.registry.list();
    return this.enabled ? all.filter((p) => this.enabled!.has(p.id)) : all;
  }

  private refreshOne(provider: UsageProvider, force: boolean): Promise<UsageData> {
    const cached = this.cache.get(provider.id);
    if (!force && cached && this.now() - cached.fetchedAt < this.ttlMs) {
      return Promise.resolve(cached.data);
    }
    const pending = this.inflight.get(provider.id);
    if (pending) return pending;

    const task = (async () => {
      let data: UsageData;
      try {
        data = await provider.getUsage();
      } catch (err) {
        data = {
          providerId: provider.id,
          providerName: provider.name,
          metrics: [],
          status: "ERROR",
          message: `${provider.name} unavailable`,
          activity: "unknown",
          lastUpdated: cached?.data.lastUpdated,
        };
        void err; // details are intentionally not logged (privacy)
      }
      this.cache.set(provider.id, { data, fetchedAt: this.now() });
      this.emit();
      return data;
    })().finally(() => this.inflight.delete(provider.id));

    this.inflight.set(provider.id, task);
    return task;
  }

  private emit(): void {
    const all = this.getAll();
    for (const l of this.listeners) l(all);
  }
}
