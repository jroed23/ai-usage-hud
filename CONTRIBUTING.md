# Contributing

Thanks for helping! Quick rules:

1. **Official sources only.** A provider integration must use an official API, CLI or documented local mechanism. No scraping, no reverse-engineered auth, no reading cookies/tokens/sessions/conversations.
2. **Never fabricate data.** If a metric is unavailable, omit it; the HUD shows "Data unavailable".
3. **No secrets in files, logs or localStorage.** Use the OS credential store.
4. Add tests for new logic (`pnpm test`, `cargo test` in `src-tauri`).
5. Keep PRs focused; run `pnpm lint && pnpm test` before opening one.

New provider? Read [docs/creating-a-provider.md](docs/creating-a-provider.md) and include a link to the official documentation in the PR.

By contributing you agree your work is released under the MIT license.
