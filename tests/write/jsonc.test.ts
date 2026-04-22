import { describe, it, expect } from "vitest";
import { createJsoncWriter } from "../../src/write/jsonc.js";
import { emitMarkerBlock, computeHashSuffix } from "../../src/round-trip/marker.js";

describe("JsoncWriter", () => {
  const writer = createJsoncWriter();

  // Case 1: supports
  describe("supports", () => {
    it("returns true for .json", () => {
      expect(writer.supports("a.json", "")).toBe(true);
    });
    it("returns true for .jsonc", () => {
      expect(writer.supports("a.jsonc", "")).toBe(true);
    });
    it("returns false for .toml", () => {
      expect(writer.supports("a.toml", "")).toBe(false);
    });
  });

  // Case 2: upsert new block (add)
  it("upsert add: inserts block before last brace", async () => {
    const source = "{\n  \"x\": 1\n}";
    const content = "// managed content here";
    const hashSuffix = "deadbeef";
    const result = await writer.write({
      source,
      ops: [{ op: "upsertBlock", id: "foo:1", content, hashSuffix }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).toContain(">>>> concord-managed:foo:1");
    expect(result.modified).toContain("<<<<");
    expect(result.modified).toContain(content);
    // Block inserted before last } so JSON structure is preserved
    const lastBrace = result.modified.lastIndexOf("}");
    const markerOpen = result.modified.indexOf(">>>> concord-managed:foo:1");
    expect(markerOpen).toBeLessThan(lastBrace);
    // blocks should include the new block
    expect(result.blocks.find((b) => b.id === "foo:1")).toBeTruthy();
  });

  // Case 3: upsert replace (existing block)
  it("upsert replace: replaces existing block content, preserves rest", async () => {
    const hashSuffix = computeHashSuffix("old content");
    const oldBlock = emitMarkerBlock({ id: "foo:1", hashSuffix, commentPrefix: "//", content: "// old content" });
    const source = `{\n  "x": 1\n${oldBlock}\n}`;
    const newContent = "// new content";
    const newHash = computeHashSuffix(newContent);
    const result = await writer.write({
      source,
      ops: [{ op: "upsertBlock", id: "foo:1", content: newContent, hashSuffix: newHash }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).not.toContain("old content");
    expect(result.modified).toContain(newContent);
    // The JSON structure outside the block is preserved
    expect(result.modified).toContain("\"x\": 1");
    const block = result.blocks.find((b) => b.id === "foo:1");
    expect(block).toBeTruthy();
  });

  // Case 4: removeBlock
  it("removeBlock: strips the marker block, preserves other content", async () => {
    const hashSuffix = "deadbeef";
    const block = emitMarkerBlock({ id: "foo:1", hashSuffix, commentPrefix: "//", content: "// managed" });
    const source = `{\n  "x": 1\n${block}\n}`;
    const result = await writer.write({
      source,
      ops: [{ op: "removeBlock", id: "foo:1" }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).not.toContain("concord-managed:foo:1");
    expect(result.modified).not.toContain("// managed");
    // Other content preserved
    expect(result.modified).toContain("\"x\": 1");
    expect(result.blocks.find((b) => b.id === "foo:1")).toBeUndefined();
  });
});
