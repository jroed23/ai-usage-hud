import type { UsageProvider } from "../types/usage";

/**
 * Holds every known provider. Adding a provider means registering it here (or
 * from a future Provider SDK loader) - the core never imports a concrete one.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, UsageProvider>();

  register(provider: UsageProvider): this {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered`);
    }
    this.providers.set(provider.id, provider);
    return this;
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  get(id: string): UsageProvider | undefined {
    return this.providers.get(id);
  }

  list(): UsageProvider[] {
    return [...this.providers.values()];
  }
}
