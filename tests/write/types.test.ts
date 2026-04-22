import { describe, it, expect } from "vitest";
import type {
  WriteOp,
  WriteRequest,
  WriteResult,
  ConfigWriter,
} from "../../src/write/types.js";
import type { ManagedBlock } from "../../src/round-trip/types.js";

describe("WriteOp union", () => {
  it("compiles all 4 variants into a readonly array", () => {
    const ops: readonly WriteOp[] = [
      { op: "upsertBlock", id: "mcp:airtable", content: "[block]", hashSuffix: "abcd1234" },
      { op: "removeBlock", id: "mcp:airtable" },
      { op: "upsertOwnedKey", path: ["tools", 0, "name"] as const, value: "airtable", hash: "deadbeef" },
      { op: "removeOwnedKey", path: ["tools", 0, "name"] as const },
    ];
    expect(ops.length).toBe(4);
  });
});

describe("ConfigWriter shape", () => {
  it("compiles a mock writer with supports + async write returning WriteResult", async () => {
    const blocks: ManagedBlock[] = [];
    const mockWriter: ConfigWriter = {
      supports(_path: string, _source: string): boolean {
        return true;
      },
      async write(_req: WriteRequest): Promise<WriteResult> {
        return {
          modified: "content",
          opsApplied: 1,
          blocks,
          originalBytes: 7,
          modifiedBytes: 7,
        };
      },
    };

    expect(mockWriter.supports("some/path", "source")).toBe(true);
    const result = await mockWriter.write({ source: "source", ops: [] });
    expect(result.opsApplied).toBe(1);
  });
});

describe("WriteResult fields", () => {
  it("all 5 fields are readable at runtime", async () => {
    const blocks: ManagedBlock[] = [
      { id: "mcp:airtable", hashSuffix: "abcd1234", startOffset: 0, endOffset: 42 },
    ];
    const mockWriter: ConfigWriter = {
      supports(_path: string, _source: string): boolean {
        return false;
      },
      async write(_req: WriteRequest): Promise<WriteResult> {
        return {
          modified: "modified-content",
          opsApplied: 2,
          blocks,
          originalBytes: 100,
          modifiedBytes: 120,
        };
      },
    };

    const result = await mockWriter.write({ source: "original", ops: [] });

    expect(result.modified).toBe("modified-content");
    expect(result.opsApplied).toBe(2);
    expect(result.blocks).toHaveLength(1);
    expect(result.originalBytes).toBe(100);
    expect(result.modifiedBytes).toBe(120);
  });
});
