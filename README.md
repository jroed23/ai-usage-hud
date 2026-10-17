# AI Usage HUD

> Monitor your AI usage directly from your desktop.
> *Monitor your AI usage. Anywhere. In real time.*

A tiny, always-on-top, draggable HUD for Windows that shows how much of your AI usage limits you have consumed, without opening a browser, dashboard or terminal.

**Independent open-source project.** Not affiliated with, endorsed by, or sponsored by Anthropic or any other AI provider. Names and marks belong to their respective owners.

## Features

- Floating, transparent HUD: always on top (optional), draggable, position remembered per monitor
- Four view modes: Minimal (icons), Compact (icon + %), Detailed, Expanded
- Drag the Claude mascot icon anywhere; click it to open the usage panel, click again to close
- Click panel with adaptive metrics, reset times and "updated Xs ago"
- System tray: show/hide, refresh, settings
- Local first and privacy focused: no account, no server, no telemetry
- Provider architecture: each AI is an isolated plugin-like module; one failing never affects the others
- Open source (MIT)

## Supported providers

| Provider | Status | Metrics | Method |
|---|---|---|---|
| Claude (Claude Code) | **Available** (Pro/Max for limits) | Session (5h) %, Weekly (7d) %, context %, model, reset times | Official Claude Code [status line](https://code.claude.com/docs/en/statusline) |
| Cursor | Not planned yet | none | no official individual-usage API found |
| Codex | Not planned yet | none | not verified |
| Gemini | Not planned yet | none | not verified |
| GitHub Copilot | Not planned yet | none | official REST API exists; not implemented |

Nothing is marked "Available" unless it works end to end. See [docs/providers.md](docs/providers.md).

## How the Claude integration works

Claude Code can run a command and pipe JSON session data to it (the *status line*). When you click **Connect**, AI Usage HUD registers its own executable (`ai-usage-hud.exe --relay`) as that command. The relay keeps **only** usage percentages, reset times, the model name and context % in a local file; any status line you already had keeps working. **Disconnect** restores it. A backup of `~/.claude/settings.json` is created once.

Usage numbers appear after Claude Code's first response in a session. Limits are only reported for Claude.ai Pro and Max subscribers.

**Where updates come from.** Your plan limits are shared by every Claude surface, but only **Claude Code in a terminal** (the `claude` CLI) runs the status line that feeds the HUD. The Claude desktop app and the VS Code extension do not, so usage from them shows up the next time a terminal session gets a response. When the data is older than 5 minutes the HUD greys out the number and tells you how old it is.

## Build

Requirements: Node 20+, pnpm, Rust (stable), Visual Studio Build Tools (C++), WebView2.

```bash
pnpm install
pnpm tauri dev      # run in development
pnpm test           # frontend tests
pnpm tauri build    # installer in src-tauri/target/release/bundle/
```

## Documentation

[architecture](docs/architecture.md) · [providers](docs/providers.md) · [security](docs/security.md) · [privacy](docs/privacy.md) · [development](docs/development.md) · [creating a provider](docs/creating-a-provider.md) · [troubleshooting](docs/troubleshooting.md) · [brand assets](docs/brand-assets.md) · [security review](docs/security-review.md)

## Roadmap

See [CHANGELOG.md](CHANGELOG.md). Other providers, alerts (50/75/90/100%), history and a Provider SDK are future work.

## License

[MIT](LICENSE)
