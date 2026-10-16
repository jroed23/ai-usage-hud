import { describe, expect, it, vi } from "vitest";
import { ClaudeProvider, type ClaudeBackend, type ClaudeSnapshot } from "../src/providers/claude/ClaudeProvider";
import { ProviderRegistry } from "../src/providers/registry";
import { UsageService } from "../src/services/usage/UsageService";
import { DEFAULT_SETTINGS, MemoryStorage, loadSettings, saveSettings } from "../src/services/storage/settings";
import type { UsageData, UsageProvider } from "../src/types/usage";

const NOW = 1_700_000_000_000;

function snap(over: Partial<ClaudeSnapshot> = {}): ClaudeSnapshot {
  return {
    updatedAt: NOW / 1000 - 8,
    model: "Opus",
    fiveHour: { usedPercentage: 42, resetsAt: NOW / 1000 + 3600 },
    sevenDay: { usedPercentage: 28, resetsAt: NOW / 1000 + 86400 },
    contextUsedPercentage: 10,
    contextWindowSize: 200000,
    ...over,
  };
}

function backend(over: Partial<ClaudeBackend> = {}): ClaudeBackend {
  return {
    snapshot: async () => snap(),
    detect: async () => ({ installed: true, connected: true }),
    connect: async () => undefined,
    disconnect: async () => undefined,
    ...over,
  };
}

describe("ClaudeProvider", () => {
  it("maps the status line snapshot to metrics", async () => {
    const data = await new ClaudeProvider(backend(), () => NOW).getUsage();
    expect(data.status).toBe("CONNECTED");
    expect(data.activity).toBe("active");
    expect(data.model).toBe("Opus");
    expect(data.metrics.map((m) => [m.id, m.percent])).toEqual([
      ["session", 42],
      ["weekly", 28],
      ["context", 10],
    ]);
    expect(data.metrics[2].used).toBe(20000);
  });

  it("omits windows whose reset time already passed (no stale data)", async () => {
    const b = backend({
      snapshot: async () => snap({ fiveHour: { usedPercentage: 99, resetsAt: NOW / 1000 - 1 } }),
    });
    const data = await new ClaudeProvider(b, () => NOW).getUsage();
    expect(data.metrics.find((m) => m.id === "session")).toBeUndefined();
  });

  it("reports DATA_UNAVAILABLE instead of zeros when limits are absent", async () => {
    const b = backend({
      snapshot: async () =>
        snap({ fiveHour: null, sevenDay: null, contextUsedPercentage: null }),
    });
    const data = await new ClaudeProvider(b, () => NOW).getUsage();
    expect(data.status).toBe("DATA_UNAVAILABLE");
    expect(data.metrics).toEqual([]);
  });

  it("walks through the status ladder", async () => {
    const mk = (d: { installed: boolean; connected: boolean }, s: ClaudeSnapshot | null) =>
      new ClaudeProvider(backend({ detect: async () => d, snapshot: async () => s }), () => NOW);
    expect(await mk({ installed: false, connected: false }, null).getStatus()).toBe("UNAVAILABLE");
    expect(await mk({ installed: true, connected: false }, null).getStatus()).toBe("DISCONNECTED");
    expect(await mk({ installed: true, connected: true }, null).getStatus()).toBe("DATA_UNAVAILABLE");
    expect(await mk({ installed: true, connected: true }, snap()).getStatus()).toBe("CONNECTED");
  });

  it("marks an old snapshot idle and delegates connect/disconnect", async () => {
    const connect = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);
    const p = new ClaudeProvider(
      backend({ connect, disconnect, snapshot: async () => snap({ updatedAt: NOW / 1000 - 3600 }) }),
      () => NOW,
    );
    expect((await p.getUsage()).activity).toBe("idle");
    await p.connect();
    await p.disconnect();
    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});

describe("ProviderRegistry", () => {
  const fake = (id: string): UsageProvider => ({ id, name: id } as UsageProvider);
  it("registers, lists and rejects duplicates", () => {
    const r = new ProviderRegistry().register(fake("a")).register(fake("b"));
    expect(r.list().map((p) => p.id)).toEqual(["a", "b"]);
    expect(r.get("a")?.id).toBe("a");
    expect(() => r.register(fake("a"))).toThrow();
    expect(r.unregister("a")).toBe(true);
    expect(r.get("a")).toBeUndefined();
  });
});

function stub(id: string, getUsage: () => Promise<UsageData>): UsageProvider {
  return {
    id,
    name: id,
    icon: id[0],
    brand: { color: "#000", officialUrl: "", docsUrl: "", officialLogo: false },
    connect: async () => undefined,
    disconnect: async () => undefined,
    getStatus: async () => "CONNECTED",
    isAvailable: async () => true,
    getUsage,
  };
}

const ok = (id: string): UsageData => ({
  providerId: id,
  providerName: id,
  metrics: [],
  status: "CONNECTED",
  activity: "idle",
});

describe("UsageService", () => {
  it("isolates a failing provider from the others", async () => {
    const registry = new ProviderRegistry()
      .register(stub("claude", async () => { throw new Error("boom"); }))
      .register(stub("cursor", async () => ok("cursor")))
      .register(stub("codex", async () => ok("codex")));
    const all = await new UsageService(registry).refresh(true);
    expect(all.claude.status).toBe("ERROR");
    expect(all.claude.message).toBe("claude unavailable");
    expect(all.cursor.status).toBe("CONNECTED");
    expect(all.codex.status).toBe("CONNECTED");
  });

  it("serves from cache within the TTL and refetches when forced or expired", async () => {
    let t = 0;
    const fn = vi.fn(async () => ok("a"));
    const svc = new UsageService(new ProviderRegistry().register(stub("a", fn)), { ttlMs: 1000, now: () => t });
    await svc.refresh();
    await svc.refresh();
    expect(fn).toHaveBeenCalledTimes(1);
    t = 1500;
    await svc.refresh();
    expect(fn).toHaveBeenCalledTimes(2);
    await svc.refresh(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("dedupes concurrent refreshes", async () => {
    const fn = vi.fn(async () => ok("a"));
    const svc = new UsageService(new ProviderRegistry().register(stub("a", fn)));
    await Promise.all([svc.refresh(true), svc.refresh(true)]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("only refreshes enabled providers and notifies subscribers", async () => {
    const a = vi.fn(async () => ok("a"));
    const b = vi.fn(async () => ok("b"));
    const svc = new UsageService(new ProviderRegistry().register(stub("a", a)).register(stub("b", b)));
    svc.setEnabled(["a"]);
    const seen = vi.fn();
    svc.subscribe(seen);
    await svc.refresh(true);
    expect(b).not.toHaveBeenCalled();
    expect(seen).toHaveBeenCalled();
    expect(Object.keys(svc.getAll())).toEqual(["a"]);
  });

  it("connect and disconnect refresh the provider afterwards", async () => {
    const fn = vi.fn(async () => ok("a"));
    const p = stub("a", fn);
    const connect = vi.spyOn(p, "connect");
    const disconnect = vi.spyOn(p, "disconnect");
    const svc = new UsageService(new ProviderRegistry().register(p));
    await svc.connect("a");
    await svc.disconnect("a");
    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledTimes(2);
    await expect(svc.connect("nope")).rejects.toThrow();
  });
});

describe("settings storage", () => {
  it("returns defaults, round-trips and sanitizes", async () => {
    const storage = new MemoryStorage();
    expect(await loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    await saveSettings(storage, { ...DEFAULT_SETTINGS, viewMode: "expanded", opacity: 5, refreshSeconds: 0 });
    const s = await loadSettings(storage);
    expect(s.viewMode).toBe("expanded");
    expect(s.opacity).toBe(1);
    expect(s.refreshSeconds).toBe(2);
  });
});
