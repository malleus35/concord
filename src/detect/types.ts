export type AgentName = "claude-code" | "codex" | "opencode";

export interface AgentInfo {
  installed: boolean;
  version: string | null;
  path: string | null;
  features?: Record<string, boolean>;
}

export interface DetectCache {
  generated_at: string;
  agents: Record<AgentName, AgentInfo>;
}
