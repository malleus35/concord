import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigScope } from "../schema/types.js";

export interface AdoptCandidate {
  scope: ConfigScope;
  /** Stable within one (scope, provider) pair; not globally unique across scopes. */
  id: string;
  /**
   * Phase 1 limits `concord adopt` to file-based asset types (skills/subagents).
   * MCP / hooks / plugins / instructions require provider-config parsing and are
   * out of scope — they are added via `concord import` or manual manifest edits.
   */
  assetType: "skills" | "subagents";
  provider: "claude-code" | "codex" | "opencode";
  /** Absolute path to the asset directory or .md file. */
  path: string;
}

export interface AdoptScanContext {
  concordHome: string;
  cwd: string;
  /** Override for tests; defaults to concordHome when user-scope. */
  userHome?: string;
}

interface ScanRoot {
  provider: AdoptCandidate["provider"];
  assetType: AdoptCandidate["assetType"];
  path: string;
}

/** Returns the set of filesystem roots to scan for a given scope. */
function rootsForScope(scope: ConfigScope, ctx: AdoptScanContext): ScanRoot[] {
  const userRoot = ctx.userHome ?? ctx.concordHome;
  if (scope === "project" || scope === "local") {
    return [
      { provider: "claude-code", assetType: "skills",    path: join(ctx.cwd, ".claude", "skills") },
      { provider: "claude-code", assetType: "subagents", path: join(ctx.cwd, ".claude", "agents") },
      { provider: "codex",       assetType: "skills",    path: join(ctx.cwd, ".agents", "skills") },
      { provider: "opencode",    assetType: "skills",    path: join(ctx.cwd, ".opencode", "skills") },
    ];
  }
  if (scope === "user") {
    return [
      { provider: "claude-code", assetType: "skills",    path: join(userRoot, ".claude", "skills") },
      { provider: "claude-code", assetType: "subagents", path: join(userRoot, ".claude", "agents") },
      { provider: "codex",       assetType: "skills",    path: join(userRoot, ".agents", "skills") },
      { provider: "opencode",    assetType: "skills",    path: join(userRoot, ".config", "opencode", "skills") },
    ];
  }
  // enterprise: Phase 1 leaves enterprise scope out of the default scan surface.
  return [];
}

/** Scan a scope root and yield candidate manifest entries. */
export async function scanScopeForCandidates(scope: ConfigScope, ctx: AdoptScanContext): Promise<AdoptCandidate[]> {
  const out: AdoptCandidate[] = [];
  for (const { provider, assetType, path } of rootsForScope(scope, ctx)) {
    let entries: string[];
    try {
      entries = await readdir(path);
    } catch {
      continue; // missing root → no candidates, never throw
    }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const full = join(path, name);
      const st = await stat(full).catch(() => null);
      if (!st) continue;
      if (!st.isDirectory() && !name.endsWith(".md")) continue;
      const id = `${provider}:${assetType}:${name.replace(/\.md$/, "")}`;
      out.push({ scope, id, assetType, provider, path: full });
    }
  }
  return out;
}
