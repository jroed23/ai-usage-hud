# Security

- **No secrets.** The Claude integration needs no credentials. Future providers must use the Windows Credential Manager or official OAuth; never `.env`, JSON config, `localStorage` or logs.
- **Whitelisted relay.** `src-tauri/src/claude.rs::sanitize` copies only: update time, model name, 5h/7d usage % and reset time, context %. Test `sanitize_keeps_only_usage_fields` guarantees cwd, transcript path and session id are dropped.
- **Settings edits.** On Connect the app changes only the `statusLine` key of `~/.claude/settings.json`, creates `settings.json.ai-usage-hud.bak` once, refuses to touch a file that is not valid JSON, and preserves a previous status line (re-executed with the original payload). Disconnect restores it.
- **Relay data location:** `%APPDATA%\ai-usage-hud\claude-usage.json` (percentages only).
- **Tauri hardening:** strict CSP, minimal capability list (`src-tauri/capabilities/default.json`), no network access.
- **Chained command:** the previous status line command comes from the user's own settings and runs with the user's privileges, exactly as Claude Code would have run it.
