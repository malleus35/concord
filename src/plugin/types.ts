export interface PluginManifest {
  provider: "claude-code" | "codex" | "opencode";
  name: string;
  version: string | null;
  skills: string[];
  subagents: string[];
  hooks: string[];
  mcp_servers: string[];
  instructions: string[];
  /** Raw source file content for debugging (never persisted). */
  _rawPath: string;
}
