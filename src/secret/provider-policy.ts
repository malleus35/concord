export type Provider = "claude-code" | "codex" | "opencode";
export type AssetType = "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";

/**
 * E-5 OpenCode symmetric exemption: OpenCode natively resolves `{env:X}`
 * → concord interpolating opencode-bound entries would double-substitute (Π3).
 */
export function shouldConcordInterpolate(provider: Provider, _assetType: AssetType): boolean {
  if (provider === "opencode") return false;
  return true;
}
