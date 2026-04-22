import { readPlugin, type PluginProvider } from "./registry.js";

export type CapabilityStatus = "supported" | "detected-not-executed" | "na" | "failed";

export interface CapabilityEntry {
  status: CapabilityStatus;
  reason: string | null;
  count: number;
}

export interface CapabilityMatrix {
  provider: PluginProvider;
  byAssetType: Record<
    "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions",
    CapabilityEntry
  >;
}

export async function introspectPlugin(
  pluginDir: string,
  provider: PluginProvider,
): Promise<CapabilityMatrix> {
  const manifest = await readPlugin(pluginDir, provider);
  if (manifest === null) {
    const failed: CapabilityEntry = { status: "failed", reason: "PluginJsonMissing", count: 0 };
    return {
      provider,
      byAssetType: {
        skills: failed,
        subagents: failed,
        hooks: failed,
        mcp_servers: failed,
        instructions: failed,
      },
    };
  }
  return {
    provider,
    byAssetType: {
      skills: entryFor(manifest.skills),
      subagents: entryFor(manifest.subagents),
      hooks: entryFor(manifest.hooks),
      mcp_servers: entryFor(manifest.mcp_servers),
      instructions: entryFor(manifest.instructions),
    },
  };
}

function entryFor(list: string[]): CapabilityEntry {
  return list.length > 0
    ? { status: "supported", reason: null, count: list.length }
    : { status: "na", reason: null, count: 0 };
}
