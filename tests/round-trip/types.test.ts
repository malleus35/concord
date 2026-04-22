import { describe, it, expect } from "vitest";
import type {
  ConfigFileEditor,
  Edit,
  PreservationReport,
  ManagedBlock,
  EditResult,
} from "../../src/round-trip/types.js";

describe("round-trip/types", () => {
  it("Edit 타입: path + value + op (set|delete)", () => {
    const setEdit: Edit = { op: "set", path: ["mcpServers", "airtable"], value: { command: "npx" } };
    const deleteEdit: Edit = { op: "delete", path: ["mcpServers", "old"] };
    expect(setEdit.op).toBe("set");
    expect(deleteEdit.op).toBe("delete");
  });

  it("ManagedBlock: id + hashSuffix + startOffset + endOffset", () => {
    const block: ManagedBlock = {
      id: "mcp_servers:airtable",
      hashSuffix: "abc12345",
      startOffset: 10,
      endOffset: 120,
    };
    expect(block.id).toBe("mcp_servers:airtable");
  });

  it("PreservationReport: outsideChangesByteCount + changedRegions", () => {
    const report: PreservationReport = {
      preserved: true,
      outsideChangesByteCount: 0,
      changedRegions: [{ startOffset: 10, endOffset: 50 }],
      originalBytes: 100,
      modifiedBytes: 105,
    };
    expect(report.preserved).toBe(true);
    expect(report.outsideChangesByteCount).toBe(0);
  });

  it("EditResult: modified + edits + bytes", () => {
    const result: EditResult = {
      modified: '{"a":1}',
      editsApplied: 1,
      originalBytes: 7,
      modifiedBytes: 7,
    };
    expect(result.editsApplied).toBe(1);
  });

  it("ConfigFileEditor shape: load/edit/serialize/verify 메서드 선언됨", () => {
    // 타입 레벨 shape 검증 — 런타임 assertion 아닌 컴파일 타임
    // 실제 구현은 Task 5+ 에서. 여기선 shape 만 compile 되면 OK.
    const _shape: ConfigFileEditor = {
      load: async () => ({ source: "", markers: [] }),
      edit: async () => ({ modified: "", editsApplied: 0, originalBytes: 0, modifiedBytes: 0 }),
      serialize: (doc) => doc.source,
      verify: () => ({ preserved: true, outsideChangesByteCount: 0, changedRegions: [], originalBytes: 0, modifiedBytes: 0 }),
    };
    expect(typeof _shape.load).toBe("function");
  });
});
