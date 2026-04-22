import YAML from "yaml";
import type { AssetType } from "../schema/types.js";
import { insertEntry } from "./insert-entry.js";

export type MergePolicy = "skip" | "replace" | "keep-mine" | "alias";

export interface ConflictReport {
  assetType: AssetType;
  id: string;
  action: "skipped" | "replaced" | "aliased" | "kept-mine";
}

export interface MergeResult {
  merged: string;
  conflicts: ConflictReport[];
}

const ASSET_TYPES: readonly AssetType[] = [
  "skills",
  "subagents",
  "hooks",
  "mcp_servers",
  "instructions",
  "plugins",
];

function hasId(doc: YAML.Document, assetType: AssetType, id: string): boolean {
  const seq = doc.get(assetType, true);
  if (!YAML.isSeq(seq)) return false;
  return seq.items.some((it) => YAML.isMap(it) && it.get("id") === id);
}

function replaceEntry(doc: YAML.Document, assetType: AssetType, entry: Record<string, unknown>): void {
  const seq = doc.get(assetType, true);
  if (!YAML.isSeq(seq)) return;
  const idx = seq.items.findIndex((it) => YAML.isMap(it) && it.get("id") === entry.id);
  if (idx >= 0) {
    seq.items[idx] = doc.createNode(entry) as YAML.Node;
  }
}

export function mergeExternal(
  ownSource: string,
  external: Record<string, unknown>,
  policy: MergePolicy,
): MergeResult {
  let src = ownSource;
  const conflicts: ConflictReport[] = [];

  for (const at of ASSET_TYPES) {
    const list = external[at];
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      const id = entry.id;
      if (typeof id !== "string") continue;

      const doc = YAML.parseDocument(src);
      if (hasId(doc, at, id)) {
        switch (policy) {
          case "skip":
            conflicts.push({ assetType: at, id, action: "skipped" });
            break;
          case "keep-mine":
            conflicts.push({ assetType: at, id, action: "kept-mine" });
            break;
          case "replace":
            replaceEntry(doc, at, entry);
            src = doc.toString();
            conflicts.push({ assetType: at, id, action: "replaced" });
            break;
          case "alias": {
            src = insertEntry(src, at, { ...entry, id: `${id}-ext` });
            conflicts.push({ assetType: at, id, action: "aliased" });
            break;
          }
        }
      } else {
        src = insertEntry(src, at, entry as { id: string });
      }
    }
  }

  return { merged: src, conflicts };
}
