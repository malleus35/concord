import YAML from "yaml";
import type { AssetType } from "../schema/types.js";

export type { AssetType };

/**
 * Append `entry` to the given asset list while preserving YAML comments/order.
 * Throws if an entry with the same `id` already exists.
 *
 * Known edge: when `<assetType>` exists as a null-valued key carrying a trailing
 * comment (e.g. `skills: # todo`), the `doc.set` fallback discards that comment.
 * Anchors/aliases (`- *foo`) are ignored by the duplicate check.
 */
export function insertEntry(
  source: string,
  assetType: AssetType,
  entry: { id: string; [k: string]: unknown },
): string {
  const doc = YAML.parseDocument(source);
  const node = doc.get(assetType, true);

  if (!YAML.isSeq(node)) {
    doc.set(assetType, [entry]);
    return doc.toString();
  }

  for (const item of node.items) {
    if (YAML.isMap(item) && item.get("id") === entry.id) {
      throw new Error(`duplicate id '${entry.id}' already present in '${assetType}'`);
    }
  }

  doc.addIn([assetType], entry);
  return doc.toString();
}
