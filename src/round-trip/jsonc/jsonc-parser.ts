import * as jsoncParser from "jsonc-parser";
import type {
  ConfigFileEditor,
  ConfigDocument,
  Edit,
  EditResult,
  PreservationReport,
} from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createJsoncParserEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      let source = doc.source;
      let applied = 0;

      for (const e of edits) {
        const path = e.path as (string | number)[];
        const eol = detectEol(source);
        if (e.op === "set") {
          const editOps = jsoncParser.modify(source, path, e.value, {
            formattingOptions: { insertSpaces: true, tabSize: 2, eol },
          });
          source = jsoncParser.applyEdits(source, editOps);
          applied++;
        } else if (e.op === "delete") {
          const editOps = jsoncParser.modify(source, path, undefined, {
            formattingOptions: { insertSpaces: true, tabSize: 2, eol },
          });
          source = jsoncParser.applyEdits(source, editOps);
          applied++;
        }
      }

      return {
        modified: source,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(source, "utf8"),
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

function detectEol(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}
