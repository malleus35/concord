import YAML from "yaml";
import type { ConfigWriter, WriteRequest, WriteResult } from "./types.js";

export function createYamlWriter(): ConfigWriter {
  return {
    supports(path) { return /\.ya?ml$/i.test(path); },
    async write(req: WriteRequest): Promise<WriteResult> {
      const doc = YAML.parseDocument(req.source);
      let applied = 0;
      for (const op of req.ops) {
        if (op.op === "upsertOwnedKey") { doc.setIn(op.path as (string | number)[], op.value); applied++; }
        else if (op.op === "removeOwnedKey") { doc.deleteIn(op.path as (string | number)[]); applied++; }
      }
      const modified = doc.toString();
      return {
        modified, opsApplied: applied, blocks: [],
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },
  };
}
