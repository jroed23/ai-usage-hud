# Providers

Only integrations with an **official** data source are implemented. Research date: 2026-10-16.

## Claude (implemented)

- **Method:** Claude Code status line ([docs](https://code.claude.com/docs/en/statusline)). Claude Code pipes JSON to a configured command; this app registers `ai-usage-hud.exe --relay`.
- **Metrics:** `rate_limits.five_hour` and `seven_day` (`used_percentage`, `resets_at`), `context_window.used_percentage`, `model.display_name`.
- **Auth:** none (local).
- **Limits:** `rate_limits` is only present for claude.ai Pro/Max subscribers and after the first API response of a session; each window may be missing and is dropped by Claude Code after its reset. The data refreshes only while Claude Code runs.
- **Rejected:** the undocumented `/api/oauth/usage` endpoint (private token use).

## Researched, not implemented

| Provider | Finding |
|---|---|
| Cursor | Analytics API is Enterprise-only (admin key); no official individual-usage API found. |
| Codex | `/status` and App Server/SDK exist, usage-limit exposure not confirmed in docs. |
| Gemini CLI | `/stats model` shows quota interactively; no documented programmatic quota source found. |
| GitHub Copilot | REST `GET /users/{username}/settings/billing/premium_request/usage` exists; billing moved to usage-based on 2026-06-01 so applicability needs verification. |

These may be added later after verification against official documentation.
