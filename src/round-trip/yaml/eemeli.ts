import YAML from "yaml";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createEemeliYamlEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      // eemeli/yaml Document API — CST 레벨 편집 (주석 보존)
      const yamlDoc = YAML.parseDocument(doc.source);
      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          yamlDoc.setIn(e.path as (string | number)[], e.value);
          applied++;
        } else if (e.op === "delete") {
          yamlDoc.deleteIn(e.path as (string | number)[]);
          applied++;
        }
      }
      const modified = yamlDoc.toString();
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

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
