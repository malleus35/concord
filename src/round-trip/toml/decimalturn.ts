import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createDecimalturnEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },
    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      // Task 6 에서 실제 구현
      throw new Error("decimalturn editor edit: not implemented (Task 6)");
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
