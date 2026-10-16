# Development

Prerequisites: Node 20+, pnpm, Rust stable, Visual Studio 2022 Build Tools (C++ workload), WebView2 (preinstalled on Windows 11).

```bash
pnpm install
pnpm tauri dev          # app with hot reload
pnpm lint               # tsc --noEmit
pnpm test               # vitest
cd src-tauri && cargo test --lib
pnpm tauri build        # NSIS + MSI installers
```

Test the relay without Claude Code:

```bash
echo {"model":{"display_name":"Opus"},"rate_limits":{"five_hour":{"used_percentage":23.5,"resets_at":4102444800}}} | src-tauri/target/release/ai-usage-hud.exe --relay
```

Layout: see [architecture.md](architecture.md).
