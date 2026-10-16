# Security review (v0.1.0)

Scope: all tracked files, dependencies, Tauri configuration and CI. Date: 2026-10-16.

## Hard-coded data

| Check | Result |
|---|---|
| Secrets, API keys, tokens, private keys, `.env` files | None found (regex scan of every tracked file) |
| Personal data (emails, local paths, IPs) | None in source. Fixtures in tests use fake values (`C:/secret`). |
| Hard-coded endpoints | Only the Claude docs link, `claude.ai`, and the project's GitHub URL (tray menu). The app makes **no network requests**. |
| Network permissions | CSP `connect-src` allows only Tauri IPC; no HTTP plugin is installed. |

## Findings and fixes

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High | `read_settings` treated *any* read error as "empty file". With an unreadable `~/.claude/settings.json`, **Connect could overwrite the user's Claude settings** with only the status line. | Only "not found" means empty; every other failure aborts. Test `settings_parsing_never_hides_problems`. |
| 2 | Medium | A settings file whose root is not a JSON object (e.g. an array) could make the write panic. | Non-object roots are rejected before any modification. |
| 3 | Medium | `settings.json` was written in place; a crash could leave it truncated. | Write to a temp file then rename (atomic on the same volume). |
| 4 | Low | Tauri capability list contained unused permissions (`opener:allow-open-url`, window show/hide/close, scale factor). | Removed; least privilege. |
| 5 | Low | CI workflow used the default token permissions. | `permissions: contents: read` in `ci.yml`. |

## Accepted risks / notes

- **Chained status line.** The user's previous status line command runs through `cmd /C` with the Claude Code payload. It comes from the user's own settings and runs with their privileges, as Claude Code would have run it. The saved copy lives in `%APPDATA%\ai-usage-hud\relay-chain.json`; anything able to modify files as the user could already modify `settings.json` directly.
- **Local files.** The usage snapshot and preferences are stored unencrypted in the user's profile; they contain no secrets.
- **Unsigned builds.** Installers are not code signed, so Windows SmartScreen warns. Verify downloads against the GitHub release page.
- **Third-party GitHub Actions** are referenced by version tag, not commit SHA. Pinning to SHAs is recommended before wider use.
- **Dependencies.** `pnpm audit --prod`: no known vulnerabilities. Rust dependencies are checked with `cargo audit` (see the release notes for the result at publication time).
- **Mascot trademark.** The bundled Claude Code mascot belongs to Anthropic; see [brand-assets.md](brand-assets.md).
