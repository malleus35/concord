import { findMarkerBlocks, emitMarkerBlock } from "../round-trip/marker.js";
import type { ConfigWriter, WriteRequest, WriteResult, WriteOp } from "./types.js";

export function createTomlWriter(): ConfigWriter {
  return {
    supports(path) { return /\.toml$/i.test(path); },
    async write(req: WriteRequest): Promise<WriteResult> {
      let cur = req.source; let applied = 0;
      for (const op of req.ops) { cur = applyOp(cur, op); applied++; }
      return {
        modified: cur,
        opsApplied: applied,
        blocks: safe(cur),
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(cur, "utf8"),
      };
    },
  };
}

function applyOp(source: string, op: WriteOp): string {
  if (op.op === "upsertBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    const block = emitMarkerBlock({ id: op.id, hashSuffix: op.hashSuffix, commentPrefix: "#", content: op.content });
    if (existing) return source.slice(0, existing.startOffset) + block + source.slice(existing.endOffset);
    const sep = source.endsWith("\n") ? "" : "\n";
    return source + sep + "\n" + block + "\n";
  }
  if (op.op === "removeBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    if (!existing) return source;
    let s = existing.startOffset, e = existing.endOffset;
    if (source[s - 1] === "\n") s--;
    if (source[s - 1] === "\n") s--;
    if (source[e] === "\n") e++;
    return source.slice(0, s) + source.slice(e);
  }
  return source;
}

function safe(source: string) { try { return findMarkerBlocks(source, "#"); } catch { return []; } }
