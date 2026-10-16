# Security Policy

## Reporting a vulnerability

Please use GitHub's private "Report a vulnerability" (Security Advisories) feature on this repository. Do not open public issues for security problems. Expect an acknowledgement within a few days.

## Scope and design

- The app never stores credentials, cookies, tokens or conversation content.
- The only file it modifies outside its own folder is `~/.claude/settings.json` (status line entry), with a one-time backup, and only after the user clicks Connect.
- The relay stores a whitelisted subset of fields. See [docs/security.md](docs/security.md).
