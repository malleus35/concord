import type { Manifest } from "../schema/manifest.js";
import type { ConfigScope } from "../schema/types.js";
import { SCOPE_PRECEDENCE } from "../schema/types.js";

export type ManifestByScope = Partial<Record<ConfigScope, Manifest>>;

/**
 * §11.5 precedence merge.
 * Order: enterprise → user → project → local. Later overrides earlier by id.
 * Each scope is already interpolation-resolved (E-16) before reaching here.
 * Merge does NOT re-interpolate (E-14 depth 1).
 */
export function mergeByPrecedence(inputs: ManifestByScope): Manifest {
  const asset_lists: Array<keyof Manifest> = [
    "skills",
    "subagents",
    "hooks",
    "mcp_servers",
    "instructions",
    "plugins",
  ];

  const merged: Manifest = {
    skills: [],
    subagents: [],
    hooks: [],
    mcp_servers: [],
    instructions: [],
    plugins: [],
  } as Manifest;

  const indices: Record<string, Map<string, number>> = {};
  for (const key of asset_lists) indices[key] = new Map();

  for (const scope of SCOPE_PRECEDENCE) {
    const m = inputs[scope];
    if (!m) continue;

    for (const key of asset_lists) {
      const list = (m[key] ?? []) as Array<{ id: string }>;
      for (const item of list) {
        const idx = indices[key]!.get(item.id);
        const target = merged[key] as Array<{ id: string }>;
        if (idx === undefined) {
          indices[key]!.set(item.id, target.length);
          target.push(item);
        } else {
          target[idx] = item; // later scope overrides
        }
      }
    }
  }

  return merged;
}
