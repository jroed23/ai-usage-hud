import { invoke } from "@tauri-apps/api/core";
import type { ClaudeBackend, ClaudeSnapshot } from "../../providers/claude/ClaudeProvider";
import type { Detection } from "../../types/usage";

export const tauriClaudeBackend: ClaudeBackend = {
  snapshot: () => invoke<ClaudeSnapshot | null>("claude_snapshot"),
  detect: () => invoke<Detection>("claude_detect"),
  connect: () => invoke<void>("claude_connect"),
  disconnect: () => invoke<void>("claude_disconnect"),
};
