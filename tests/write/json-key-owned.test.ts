import { describe, it, expect } from "vitest";
import { createJsonKeyOwnedWriter } from "../../src/write/json-key-owned.js";

describe("JsonKeyOwnedWriter", () => {
  const writer = createJsonKeyOwnedWriter();

  // Case 1: supports
  describe("supports", () => {
    it("returns true for pure .json without comments", () => {
      expect(writer.supports("a.json", '{"x":1}')).toBe(true);
    });
    it("returns false when source has // comment", () => {
      expect(writer.supports("a.json", '// comment\n{"x":1}')).toBe(false);
    });
    it("returns false when source has /* */ comment", () => {
      expect(writer.supports("a.json", '/* c */\n{"x":1}')).toBe(false);
    });
    it("returns false for .jsonc extension", () => {
      expect(writer.supports("a.jsonc", '{"x":1}')).toBe(false);
    });
    it("returns false for .yaml extension", () => {
      expect(writer.supports("a.yaml", '{"x":1}')).toBe(false);
    });
    it("returns true for JSON with https:// URL (not a comment)", () => {
      expect(writer.supports("a.json", '{"url":"https://example.com"}')).toBe(true);
    });
  });

  // Case 2: upsertOwnedKey
  it("upsertOwnedKey: adds a new nested key preserving existing keys", async () => {
    const source = JSON.stringify({ projects: { foo: { x: 1 } } }, null, 2) + "\n";
    const result = await writer.write({
      source,
      ops: [{ op: "upsertOwnedKey", path: ["projects", "foo", "y"], value: 2, hash: "test" }],
    });
    expect(result.opsApplied).toBe(1);
    const parsed = JSON.parse(result.modified);
    expect(parsed).toEqual({ projects: { foo: { x: 1, y: 2 } } });
  });

  // Case 3: removeOwnedKey
  it("removeOwnedKey: removes a nested key, preserves sibling structure", async () => {
    const source = JSON.stringify({ projects: { foo: { x: 1, y: 2 } } }, null, 2) + "\n";
    const result = await writer.write({
      source,
      ops: [{ op: "removeOwnedKey", path: ["projects", "foo", "x"] }],
    });
    expect(result.opsApplied).toBe(1);
    const parsed = JSON.parse(result.modified);
    expect(parsed).toEqual({ projects: { foo: { y: 2 } } });
    expect(parsed.projects.foo).not.toHaveProperty("x");
    expect(parsed.projects.foo).toHaveProperty("y", 2);
  });

  // Byte tracking
  it("reports originalBytes and modifiedBytes", async () => {
    const source = '{"a":1}\n';
    const result = await writer.write({
      source,
      ops: [{ op: "upsertOwnedKey", path: ["b"], value: 2, hash: "h" }],
    });
    expect(result.originalBytes).toBe(Buffer.byteLength(source, "utf8"));
    expect(result.modifiedBytes).toBe(Buffer.byteLength(result.modified, "utf8"));
  });

  // Trailing newline
  it("modified output ends with newline", async () => {
    const source = '{"a":1}';
    const result = await writer.write({
      source,
      ops: [{ op: "upsertOwnedKey", path: ["b"], value: 2, hash: "h" }],
    });
    expect(result.modified.endsWith("\n")).toBe(true);
  });

  // Parse error
  it("throws on invalid JSON source", async () => {
    await expect(
      writer.write({ source: "not json", ops: [] })
    ).rejects.toThrow("JsonKeyOwnedWriter parse:");
  });
});
