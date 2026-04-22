import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

export async function readCodexPlugin(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = join(pluginDir, ".codex-plugin", "plugin.json");
  let raw: string;
  try { raw = await readFile(manifestPath, "utf8"); }
  catch { return null; }
  let obj: unknown;
  try { obj = JSON.parse(raw); }
  catch { return null; }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  return {
    provider: "codex",
    name: typeof o.name === "string" ? o.name : "",
    version: typeof o.version === "string" ? o.version : null,
    skills: Array.isArray(o.skills) ? o.skills.filter((x): x is string => typeof x === "string") : [],
    subagents: Array.isArray(o.subagents) ? o.subagents.filter((x): x is string => typeof x === "string") : [],
    hooks: Array.isArray(o.hooks) ? o.hooks.filter((x): x is string => typeof x === "string") : [],
    mcp_servers: Array.isArray(o.mcp_servers) ? o.mcp_servers.filter((x): x is string => typeof x === "string") : [],
    instructions: Array.isArray(o.instructions) ? o.instructions.filter((x): x is string => typeof x === "string") : [],
    _rawPath: manifestPath,
  };
}
