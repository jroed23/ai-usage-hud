# Troubleshooting

**Claude shows "Waiting for the first Claude Code response"** - send any message in Claude Code; the data arrives with the first response after connecting (restart running sessions if needed).

**"Claude Code did not report usage limits"** - limits are only sent for Claude.ai Pro/Max subscribers.

**Status "Unavailable"** - `~/.claude` was not found; run Claude Code once.

**Connect fails: settings.json is not valid JSON** - fix the file; the app refuses to modify it.

**HUD is off-screen** - tray menu > Show HUD. If a monitor was unplugged the HUD relocates automatically on start.

**Reset everything** - Settings > Providers > Disconnect restores your previous status line; backup: `~/.claude/settings.json.ai-usage-hud.bak`.
