# Troubleshooting

**Claude shows "Waiting for the first Claude Code response"** - send any message in Claude Code; the data arrives with the first response after connecting (restart running sessions if needed).

**"Claude Code did not report usage limits"** - limits are only sent for Claude.ai Pro/Max subscribers.

**Status "Unavailable"** - `~/.claude` was not found; run Claude Code once.

**Connect fails: settings.json is not valid JSON** - fix the file; the app refuses to modify it.

**HUD is off-screen** - tray menu > Show HUD. If a monitor was unplugged the HUD relocates automatically on start.

**Reset everything** - Settings > Providers > Disconnect restores your previous status line; backup: `~/.claude/settings.json.ai-usage-hud.bak`.

**Connected but "Waiting for the first Claude Code response" never ends** - the status line is a feature of the Claude Code CLI (`claude` in a terminal). Sessions in other front ends may not run it. Start `claude`, send a message, and the numbers appear.

**After installing the app, the HUD says Disconnected** - the status line stores the path of the executable. If you moved or reinstalled the app, click Disconnect then Connect again.

**Status line never runs / HUD stays on "—" even after replying** - on Windows, Claude Code runs the status line through Git Bash, which eats backslashes in the command path. Since v0.1.1 the app writes the path with forward slashes. If you connected with v0.1.0, click Disconnect then Connect (or edit `statusLine.command` in `~/.claude/settings.json` to use `/`). The status line also needs the folder to be trusted and a normal interactive `claude` session; verify with `claude --debug` (look for "Status line command skipped").

**The HUD is behind what the VS Code extension or claude.ai shows** - only terminal sessions send data. Data older than 5 minutes is greyed out; send any message in a terminal `claude` session to sync.
