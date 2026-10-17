# Changelog

All notable changes are documented here. Format based on Keep a Changelog; versions follow SemVer.

## [0.1.1] - 2026-10-16

### Fixed
- Claude data never arrived on Windows: Claude Code could not run the relay from AppData (bash: "No such file or directory") and Git Bash ate backslashes in the path. The relay is now copied to `~/.claude/ai-usage-hud/relay.exe` and registered as `~/.claude/ai-usage-hud/relay.exe --relay`. **If you connected with 0.1.0, click Disconnect then Connect.**
- Stale values when several Claude Code sessions are open: within the same usage window the highest value is kept and an older window never replaces a newer one.

### Security
- Never overwrite an unreadable or non-object `~/.claude/settings.json`; atomic writes; least-privilege Tauri capabilities.

## [0.1.0] - 2026-10-16

### Added
- Floating HUD (transparent, always on top, draggable, multi-monitor aware, position persisted)
- Minimal / Compact / Detailed / Expanded view modes and hover panel
- System tray, settings window and first-run welcome
- `UsageProvider` architecture with `ProviderRegistry` and `UsageService` (cache, isolation)
- Claude provider via the official Claude Code status line (session, weekly, context, model)
- Documentation, CI and release workflows

### Roadmap
- 0.2: alerts (50/75/90/100%) and local history
- later: additional providers (only with verified official data sources), Provider SDK
