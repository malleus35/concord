import type { ConfigWriter, WriteRequest, WriteResult } from "./types.js";

export function createJsonKeyOwnedWriter(): ConfigWriter {
  return {
    supports(path, source) {
      if (!/\.json$/i.test(path)) return false;
      if (/(^|[^:\\])\/\//.test(source)) return false;
      if (/\/\*/.test(source)) return false;
      return true;
    },
    async write(req: WriteRequest): Promise<WriteResult> {
      let obj: any;
      try { obj = JSON.parse(req.source); }
      catch (err) { throw new Error(`JsonKeyOwnedWriter parse: ${err instanceof Error ? err.message : String(err)}`); }
      let applied = 0;
      for (const op of req.ops) {
        if (op.op === "upsertOwnedKey") { setDeep(obj, op.path, op.value); applied++; }
        else if (op.op === "removeOwnedKey") { deleteDeep(obj, op.path); applied++; }
      }
      const modified = JSON.stringify(obj, null, 2) + "\n";
      return {
        modified, opsApplied: applied, blocks: [],
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },
  };
}

function setDeep(obj: any, path: readonly (string | number)[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    if (cur[k] === undefined) cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]!] = value;
}

function deleteDeep(obj: any, path: readonly (string | number)[]): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    if (cur[k] === undefined) return;
    cur = cur[k];
  }
  delete cur[path[path.length - 1]!];
}
