import TOML from "@ltd/j-toml";
import type {
  ConfigFileEditor,
  ConfigDocument,
  Edit,
  EditResult,
  PreservationReport,
} from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createLtdJTomlEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      const source = doc.source;
      const table = TOML.parse(source, { joiner: "\n", bigint: false }) as any;

      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          setDeep(table, e.path, e.value);
          applied++;
        } else if (e.op === "delete") {
          deleteDeep(table, e.path);
          applied++;
        }
      }

      const stringified = TOML.stringify(table, { newline: "\n", newlineAround: "section" });
      const modStr = Array.isArray(stringified) ? stringified.join("\n") : String(stringified);

      return {
        modified: modStr,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(source, "utf8"),
        modifiedBytes: Buffer.byteLength(modStr, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(
      original: string,
      modified: string,
      changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>,
    ): PreservationReport {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}

function setDeep(obj: any, path: readonly (string | number)[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined) cur[key] = {};
    cur = cur[key];
  }
  cur[path[path.length - 1]!] = value;
}

function deleteDeep(obj: any, path: readonly (string | number)[]): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined) return;
    cur = cur[key];
  }
  delete cur[path[path.length - 1]!];
}
