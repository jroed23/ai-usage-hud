import { tauriClaudeBackend } from "../services/detection/tauriClaudeBackend";
import { ClaudeProvider } from "./claude/ClaudeProvider";
import { ProviderRegistry } from "./registry";

/** Only Claude is implemented for now; other providers are intentionally out of scope. */
export function createDefaultRegistry(): ProviderRegistry {
  return new ProviderRegistry().register(new ClaudeProvider(tauriClaudeBackend));
}
