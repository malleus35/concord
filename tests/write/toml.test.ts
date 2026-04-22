import { describe, it, expect } from "vitest";
import { createTomlWriter } from "../../src/write/toml.js";
import { emitMarkerBlock, computeHashSuffix } from "../../src/round-trip/marker.js";

describe("TomlWriter", () => {
  const writer = createTomlWriter();

  // Case 1: supports
  describe("supports", () => {
    it("returns true for .toml", () => {
      expect(writer.supports("config.toml", "")).toBe(true);
    });
    it("returns false for .json", () => {
      expect(writer.supports("config.json", "")).toBe(false);
    });
    it("returns false for .yaml", () => {
      expect(writer.supports("config.yaml", "")).toBe(false);
    });
  });

  // Case 2: upsert append at end (new block, # prefix)
  it("upsert add: appends block at end of file", async () => {
    const source = "[package]\nname = \"my-app\"\nversion = \"1.0.0\"\n";
    const content = "# managed content here";
    const hashSuffix = "deadbeef";
    const result = await writer.write({
      source,
      ops: [{ op: "upsertBlock", id: "foo:1", content, hashSuffix }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).toContain(">>>> concord-managed:foo:1");
    expect(result.modified).toContain("<<<<");
    expect(result.modified).toContain(content);
    // Block should appear after original TOML content
    const markerOpen = result.modified.indexOf(">>>> concord-managed:foo:1");
    const originalEnd = result.modified.indexOf("[package]");
    expect(markerOpen).toBeGreaterThan(originalEnd);
    // blocks should include the new block
    expect(result.blocks.find((b) => b.id === "foo:1")).toBeTruthy();
    // comment prefix should be "#"
    expect(result.modified).toContain("# >>>> concord-managed:foo:1");
  });

  // Case 3: removeBlock strips marker, preserves surrounding content
  it("removeBlock: strips the marker block, preserves other content", async () => {
    const hashSuffix = "deadbeef";
    const block = emitMarkerBlock({ id: "foo:1", hashSuffix, commentPrefix: "#", content: "# managed" });
    const source = "[package]\nname = \"my-app\"\n\n" + block + "\n\n[dependencies]\n";
    const result = await writer.write({
      source,
      ops: [{ op: "removeBlock", id: "foo:1" }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).not.toContain("concord-managed:foo:1");
    expect(result.modified).not.toContain("# managed");
    // Other content preserved
    expect(result.modified).toContain("[package]");
    expect(result.modified).toContain("[dependencies]");
    expect(result.blocks.find((b) => b.id === "foo:1")).toBeUndefined();
  });

  // Case 4: upsert replace (existing block)
  it("upsert replace: replaces existing block content, preserves rest", async () => {
    const hashSuffix = computeHashSuffix("# old content");
    const oldBlock = emitMarkerBlock({ id: "foo:1", hashSuffix, commentPrefix: "#", content: "# old content" });
    const source = "[package]\nname = \"my-app\"\n\n" + oldBlock + "\n";
    const newContent = "# new content";
    const newHash = computeHashSuffix(newContent);
    const result = await writer.write({
      source,
      ops: [{ op: "upsertBlock", id: "foo:1", content: newContent, hashSuffix: newHash }],
    });
    expect(result.opsApplied).toBe(1);
    expect(result.modified).not.toContain("old content");
    expect(result.modified).toContain(newContent);
    // Original TOML content preserved
    expect(result.modified).toContain("[package]");
    const block = result.blocks.find((b) => b.id === "foo:1");
    expect(block).toBeTruthy();
  });
});
