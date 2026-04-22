import { describe, it, expect } from "vitest";
import { encodeForJson, encodeForYaml, encodeForToml } from "../../src/secret/encode.js";

describe("POC-14 target-format encoding edges", () => {
  describe("JSON", () => {
    it("escapes control chars", () => {
      const out = encodeForJson("a\"b\n");
      expect(out).toBe('"a\\"b\\n"');
    });
    it("single-line string", () => {
      expect(encodeForJson("hello")).toBe('"hello"');
    });
  });

  describe("YAML", () => {
    it("single-line uses JSON-style quoting", () => {
      expect(encodeForYaml("plain")).toBe('"plain"');
    });
    it("multi-line PEM uses literal block (no \\n escapes)", () => {
      const pem = "-----BEGIN KEY-----\nAAAA\n-----END KEY-----";
      const out = encodeForYaml(pem);
      expect(out.startsWith("|")).toBe(true);
      expect(out).toContain("BEGIN KEY");
      expect(out.includes("\\n")).toBe(false);
    });
    it("trailing newline uses strip-chomping indicator", () => {
      const withTrailing = "line1\nline2\n";
      const out = encodeForYaml(withTrailing);
      expect(out.startsWith("|\n")).toBe(true);
      const withoutTrailing = "line1\nline2";
      const out2 = encodeForYaml(withoutTrailing);
      expect(out2.startsWith("|-\n")).toBe(true);
    });
  });

  describe("TOML", () => {
    it("basic string escapes quotes and backslashes", () => {
      expect(encodeForToml('quote: "hi"')).toBe('"quote: \\"hi\\""');
      expect(encodeForToml("back\\slash")).toBe('"back\\\\slash"');
    });
    it("multi-line uses triple-quoted string", () => {
      const out = encodeForToml("line1\nline2");
      expect(out.startsWith('"""')).toBe(true);
      expect(out.endsWith('"""')).toBe(true);
      expect(out).toContain("line1");
      expect(out).toContain("line2");
    });
  });
});
