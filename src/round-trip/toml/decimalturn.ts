import * as tomlPatch from "@decimalturn/toml-patch";
import type {
  ConfigFileEditor,
  ConfigDocument,
  Edit,
  EditResult,
  PreservationReport,
} from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createDecimalturnEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      const source = doc.source;

      // parse 후 mutate, 그 다음 patch(existing, updated) 로 format 보존
      const parsed = (tomlPatch as any).parse(source, { integersAsBigInt: false }) as Record<
        string,
        unknown
      >;

      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          setDeep(parsed, e.path, e.value);
          applied++;
        } else if (e.op === "delete") {
          deleteDeep(parsed, e.path);
          applied++;
        }
      }

      // patch(existing, updated) — format-preserving diff
      const modified: string = (tomlPatch as any).patch(source, parsed);

      return {
        modified,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
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

function setDeep(obj: Record<string, unknown>, path: readonly (string | number)[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined || cur[key] === null || typeof cur[key] !== "object") {
      cur[key] = {};
    }
    cur = cur[key];
  }
  cur[path[path.length - 1]!] = value;
}

function deleteDeep(obj: Record<string, unknown>, path: readonly (string | number)[]): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined) return;
    cur = cur[key];
  }
  delete cur[path[path.length - 1]!];
}
