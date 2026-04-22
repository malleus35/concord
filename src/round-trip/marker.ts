import { createHash } from "node:crypto";
import type { ManagedBlock } from "./types.js";

export function findMarkerBlocks(source: string, commentPrefix: "//" | "#"): ManagedBlock[] {
  const openRe = new RegExp(
    `${escapeReg(commentPrefix)}\\s*>>>>\\s*concord-managed:([^\\s]+)\\s*\\(hash:([0-9a-f]{8})\\)`,
    "g",
  );
  const closeRe = new RegExp(
    `${escapeReg(commentPrefix)}\\s*<<<<\\s*concord-managed:([^\\s]+)`,
    "g",
  );

  type Hit =
    | { kind: "open"; index: number; length: number; id: string; hash: string }
    | { kind: "close"; index: number; length: number; id: string };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(source))) {
    hits.push({ kind: "open", index: m.index, length: m[0].length, id: m[1]!, hash: m[2]! });
  }
  while ((m = closeRe.exec(source))) {
    hits.push({ kind: "close", index: m.index, length: m[0].length, id: m[1]! });
  }
  hits.sort((a, b) => a.index - b.index);

  const blocks: ManagedBlock[] = [];
  const opens: Array<{ id: string; hashSuffix: string; startOffset: number }> = [];

  for (const h of hits) {
    if (h.kind === "open") {
      if (opens.length > 0) {
        throw new Error(`marker-broken: nested marker at offset ${h.index} (id=${h.id})`);
      }
      opens.push({ id: h.id, hashSuffix: h.hash, startOffset: h.index });
    } else {
      const last = opens.pop();
      if (!last) {
        throw new Error(`marker-broken: close without open at offset ${h.index} (id=${h.id})`);
      }
      if (last.id !== h.id) {
        throw new Error(`marker-broken: close id mismatch (expected ${last.id}, got ${h.id})`);
      }
      blocks.push({
        id: last.id,
        hashSuffix: last.hashSuffix,
        startOffset: last.startOffset,
        endOffset: h.index + h.length,
      });
    }
  }
  if (opens.length > 0) {
    throw new Error(`marker-broken: open without close (id=${opens[0]!.id})`);
  }
  return blocks;
}

export function emitMarkerBlock(params: {
  id: string;
  hashSuffix: string;
  commentPrefix: "//" | "#";
  content: string;
}): string {
  const { id, hashSuffix, commentPrefix, content } = params;
  return `${commentPrefix} >>>> concord-managed:${id}  (hash:${hashSuffix})\n${content}\n${commentPrefix} <<<< concord-managed:${id}`;
}

export function computeHashSuffix(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 8);
}

function escapeReg(s: string): string {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}
