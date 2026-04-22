export interface TransformContext {
  provider: "claude-code" | "codex" | "opencode";
  platform: NodeJS.Platform;
  assetType: "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";
}

export interface FormatTransformer {
  name: string;
  transform(content: unknown, ctx: TransformContext): { applied: boolean; result: unknown };
}
