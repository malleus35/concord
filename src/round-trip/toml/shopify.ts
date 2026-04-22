import * as shopifyPatch from "@shopify/toml-patch";
import type {
  ConfigFileEditor,
  ConfigDocument,
  Edit,
  EditResult,
  PreservationReport,
} from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createShopifyEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      let source = doc.source;
      let applied = 0;

      // @shopify/toml-patch: updateTomlValues(tomlContent, patches)
      // patches: [string[], number | string | boolean | undefined | (number | string | boolean)[]][]
      // undefined value = delete key
      // 편집을 일괄 적용 (wasm 호출 최소화)
      const patches: [string[], number | string | boolean | undefined | (number | string | boolean)[]][] = [];

      for (const e of edits) {
        const pathArr = (e.path as (string | number)[]).map(String);
        if (e.op === "set") {
          const value = e.value;
          // Shopify toml-patch 는 원시 타입 + 배열만 지원
          // 객체(테이블) 삽입은 지원 불가 → 에러 메시지로 명시
          if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            throw new Error(
              `shopify/toml-patch: nested object value not supported at path [${pathArr.join(".")}]. ` +
                `Only primitives and primitive arrays are supported.`,
            );
          }
          patches.push([pathArr, value as number | string | boolean | undefined | (number | string | boolean)[]]);
          applied++;
        } else if (e.op === "delete") {
          // undefined value → key 삭제
          patches.push([pathArr, undefined]);
          applied++;
        }
      }

      if (patches.length > 0) {
        source = (shopifyPatch as any).updateTomlValues(source, patches);
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
