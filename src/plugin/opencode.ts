import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

/**
 * OpenCode plugins are npm packages — package.json#main must exist.
 * Asset lists derived from package.json#opencode convention (if present).
 */
export async function readOpenCodePlugin(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = join(pluginDir, "package.json");
  let raw: string;
  try { raw = await readFile(manifestPath, "utf8"); }
  catch { return null; }
  let obj: unknown;
  try { obj = JSON.parse(raw); }
  catch { return null; }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.main !== "string") return null;
  const ocRaw = o.opencode;
  const oc = (ocRaw && typeof ocRaw === "object") ? (ocRaw as Record<string, unknown>) : {};
  return {
    provider: "opencode",
    name: typeof o.name === "string" ? o.name : "",
    version: typeof o.version === "string" ? o.version : null,
    skills: Array.isArray(oc.skills) ? oc.skills.filter((x): x is string => typeof x === "string") : [],
    subagents: Array.isArray(oc.subagents) ? oc.subagents.filter((x): x is string => typeof x === "string") : [],
    hooks: Array.isArray(oc.hooks) ? oc.hooks.filter((x): x is string => typeof x === "string") : [],
    mcp_servers: Array.isArray(oc.mcp_servers) ? oc.mcp_servers.filter((x): x is string => typeof x === "string") : [],
    instructions: Array.isArray(oc.instructions) ? oc.instructions.filter((x): x is string => typeof x === "string") : [],
    _rawPath: manifestPath,
  };
}
