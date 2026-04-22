import { describe, it, expect } from "vitest";
import { createYamlWriter } from "../../src/write/yaml.js";

describe("YamlWriter", () => {
  const writer = createYamlWriter();

  describe("supports", () => {
    it("returns true for .yaml", () => {
      expect(writer.supports("config.yaml", "")).toBe(true);
    });
    it("returns true for .yml", () => {
      expect(writer.supports("config.yml", "")).toBe(true);
    });
    it("returns false for .json", () => {
      expect(writer.supports("config.json", "")).toBe(false);
    });
    it("returns false for .toml", () => {
      expect(writer.supports("config.toml", "")).toBe(false);
    });
  });

  describe("upsertOwnedKey", () => {
    it("adds new key while preserving existing keys", async () => {
      const source = "a: 1\nb: 2\n";
      const result = await writer.write({
        source,
        ops: [{ op: "upsertOwnedKey", path: ["c"], value: 3, hash: "h1" }],
      });
      expect(result.opsApplied).toBe(1);
      expect(result.modified).toContain("a: 1");
      expect(result.modified).toContain("b: 2");
      expect(result.modified).toContain("c: 3");
    });

    it("updates existing key value", async () => {
      const source = "a: 1\nb: 2\n";
      const result = await writer.write({
        source,
        ops: [{ op: "upsertOwnedKey", path: ["a"], value: 99, hash: "h2" }],
      });
      expect(result.opsApplied).toBe(1);
      expect(result.modified).toContain("a: 99");
      expect(result.modified).toContain("b: 2");
    });

    it("preserves comments", async () => {
      const source = "# top comment\na: 1\nb: 2\n";
      const result = await writer.write({
        source,
        ops: [{ op: "upsertOwnedKey", path: ["c"], value: 3, hash: "h3" }],
      });
      expect(result.modified).toContain("# top comment");
      expect(result.modified).toContain("c: 3");
    });
  });

  describe("removeOwnedKey", () => {
    it("removes the specified key only", async () => {
      const source = "a: 1\nb: 2\nc: 3\n";
      const result = await writer.write({
        source,
        ops: [{ op: "removeOwnedKey", path: ["b"] }],
      });
      expect(result.opsApplied).toBe(1);
      expect(result.modified).toContain("a: 1");
      expect(result.modified).not.toContain("b:");
      expect(result.modified).toContain("c: 3");
    });
  });

  describe("bytes accounting", () => {
    it("reports correct originalBytes and modifiedBytes", async () => {
      const source = "a: 1\n";
      const result = await writer.write({
        source,
        ops: [{ op: "upsertOwnedKey", path: ["b"], value: 2, hash: "h4" }],
      });
      expect(result.originalBytes).toBe(Buffer.byteLength(source, "utf8"));
      expect(result.modifiedBytes).toBe(Buffer.byteLength(result.modified, "utf8"));
    });
  });
});
