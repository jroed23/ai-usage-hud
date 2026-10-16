# Creating a provider

1. Find an **official** source (API, CLI, documented local mechanism) and link it in your PR. No private endpoints, scraping or credential capture.
2. Create `src/providers/<id>/` with a class implementing `UsageProvider` and a `brand.ts`.
3. Emit only metrics you can measure; for everything else omit the metric. Use status `DATA_UNAVAILABLE` with a message instead of zeros.
4. Keep host access behind an interface (see `ClaudeBackend`) so it can be mocked.
5. Register it in `src/providers/index.ts`.
6. Add tests next to `tests/providers.test.ts` (mapping, status ladder, failure).

```ts
export class NewAIProvider implements UsageProvider {
  readonly id = "newai";
  readonly name = "New AI";
  readonly icon = "N";
  readonly brand = { color: "#888", officialUrl: "...", docsUrl: "...", officialLogo: false };

  async connect() {}
  async disconnect() {}
  async isAvailable() { return true; }
  async getStatus() { return (await this.getUsage()).status; }
  async getUsage(): Promise<UsageData> {
    return { providerId: this.id, providerName: this.name, metrics: [], status: "DATA_UNAVAILABLE", activity: "unknown" };
  }
}
```

Credentials, if unavoidable, go in the Windows Credential Manager - never in files or logs. Logos: only bundle official assets whose brand guidelines allow it; otherwise use the glyph and document it.
