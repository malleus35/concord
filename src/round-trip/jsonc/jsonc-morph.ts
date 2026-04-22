import { parse as parseMorph } from "jsonc-morph";
import type {
  ConfigFileEditor,
  ConfigDocument,
  Edit,
  EditResult,
  PreservationReport,
} from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createJsoncMorphEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      if (doc.source.trim() === "") {
        // 빈 source 는 편집 불가 (Plan 2A 범위 밖)
        return {
          modified: doc.source,
          editsApplied: 0,
          originalBytes: 0,
          modifiedBytes: 0,
        };
      }

      const root = parseMorph(doc.source);
      let applied = 0;

      for (const e of edits) {
        const path = e.path as (string | number)[];
        if (path.some((p) => typeof p === "number")) {
          throw new Error(
            `jsonc-morph wrapper: array-index path not supported (got ${JSON.stringify(path)})`,
          );
        }
        const stringPath = path as string[];

        // traverse to parent object
        let cur: any = root.asObjectOrThrow();
        for (let i = 0; i < stringPath.length - 1; i++) {
          cur = cur.getIfObjectOrCreate(stringPath[i]!);
        }
        const lastKey = stringPath[stringPath.length - 1]!;

        if (e.op === "set") {
          const existing = cur.get(lastKey);
          if (existing) {
            existing.setValue(e.value);
          } else {
            cur.append(lastKey, e.value);
          }
        } else if (e.op === "delete") {
          cur.remove(lastKey);
        }
        applied++;
      }

      const modified = root.toString();

      return {
        modified,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
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
