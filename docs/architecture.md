# Architecture

**Stack:** Tauri 2 (Rust) + React + TypeScript + Vite. Chosen for low RAM/CPU, small installer, native Windows integration (tray, always-on-top, autostart) and auditability.

```
Claude Code ──(JSON on stdin)──▶ ai-usage-hud.exe --relay ──▶ claude-usage.json (whitelisted fields)
                                                                   │
HUD window (React) ◀── UsageService (cache, isolation) ◀── ClaudeProvider ◀── Tauri command
```

## Layers

| Layer | Path | Role |
|---|---|---|
| Types | `src/types/usage.ts` | `UsageProvider`, `UsageData`, `UsageMetric`, `ProviderStatus` |
| Providers | `src/providers/<id>/` | One class per AI implementing `UsageProvider` |
| Registry | `src/providers/registry.ts` | Discovers/holds providers; the core never imports a concrete one |
| UsageService | `src/services/usage/` | Cache with TTL, in-flight de-duplication, **per-provider error isolation** |
| Storage | `src/services/storage/` | Non-secret preferences (tauri-plugin-store) |
| UI | `src/components/` | HUD, hover panel, settings, welcome |
| Rust | `src-tauri/src/` | Relay, Claude settings management, tray, window creation |

## Universal metrics

`UsageData.metrics` is a list of `UsageMetric` (`session_limit`, `weekly_limit`, `context`, `tokens`, `requests`, ...). A provider emits only metrics it can actually measure; the UI renders whatever is present. Percentages are never defaulted to 0.

## Windows

- `hud`: transparent, undecorated, always on top, auto-sized to its content, dragged via `startDragging`.
- `settings`: normal window created on demand (tray or first run).
- The windows share preferences through the store file and notify each other with `settings-changed` / `refresh` events.

## Error isolation

`UsageService.refreshOne` wraps each provider call; a throw becomes an `ERROR` entry for that provider only (tests: `tests/providers.test.ts`).

## Future (prepared, not built)

Alerts (hook on `UsageService` subscribers), local history (append snapshots), Provider SDK / directory (register providers from external packages).
