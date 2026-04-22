import { describe, it, expect } from "vitest";
import { createWriterRegistry, resolveWriter } from "../../src/write/registry.js";

describe("WriterRegistry", () => {
  describe("createWriterRegistry", () => {
    it("returns exactly 4 writers", () => {
      const registry = createWriterRegistry();
      expect(registry).toHaveLength(4);
    });
  });

  describe("resolveWriter", () => {
    it("resolves a writer for .json (does not throw)", () => {
      const registry = createWriterRegistry();
      const writer = resolveWriter("a.json", '{"x":1}', registry);
      expect(writer.supports("a.json", '{"x":1}')).toBe(true);
    });

    it("resolves TomlWriter for .toml", () => {
      const registry = createWriterRegistry();
      const writer = resolveWriter("a.toml", "", registry);
      expect(writer.supports("a.toml", "")).toBe(true);
    });

    it("resolves YamlWriter for .yaml", () => {
      const registry = createWriterRegistry();
      const writer = resolveWriter("a.yaml", "", registry);
      expect(writer.supports("a.yaml", "")).toBe(true);
    });

    it("resolves YamlWriter for .yml", () => {
      const registry = createWriterRegistry();
      const writer = resolveWriter("a.yml", "", registry);
      expect(writer.supports("a.yml", "")).toBe(true);
    });

    it("throws for unsupported extension", () => {
      const registry = createWriterRegistry();
      expect(() => resolveWriter("a.xyz", "", registry)).toThrow(/no writer supports/);
    });
  });
});
