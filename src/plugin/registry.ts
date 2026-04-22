import type { PluginManifest } from "./types.js";
import { readClaudePlugin } from "./claude.js";
import { readCodexPlugin } from "./codex.js";
import { readOpenCodePlugin } from "./opencode.js";

export type PluginProvider = "claude-code" | "codex" | "opencode";

export async function readPlugin(pluginDir: string, provider: PluginProvider): Promise<PluginManifest | null> {
  switch (provider) {
    case "claude-code": return readClaudePlugin(pluginDir);
    case "codex":       return readCodexPlugin(pluginDir);
    case "opencode":    return readOpenCodePlugin(pluginDir);
  }
}
