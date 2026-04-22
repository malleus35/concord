import { describe, it, expect } from "vitest";
import { encodeForJson, encodeForYaml, encodeForToml } from "../../src/secret/encode.js";

describe("encode (E-18)", () => {
  it("JSON: string escape", () => {
    expect(encodeForJson("simple")).toBe('"simple"');
    expect(encodeForJson('quote"inside')).toBe('"quote\\"inside"');
    expect(encodeForJson("backslash\\")).toBe('"backslash\\\\"');
    expect(encodeForJson("line1\nline2")).toBe('"line1\\nline2"');
    expect(encodeForJson("tab\there")).toBe('"tab\\there"');
  });

  it("YAML: single-line uses double-quoted", () => {
    expect(encodeForYaml("value")).toMatch(/^"value"$/);
  });

  it("YAML: multi-line uses block scalar |", () => {
    const out = encodeForYaml("line1\nline2\nline3");
    expect(out).toContain("|");
    expect(out).toContain("line1");
    expect(out).toContain("line3");
  });

  it("YAML: PEM block preserved", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n";
    const out = encodeForYaml(pem);
    expect(out).toContain("BEGIN CERTIFICATE");
    expect(out).toContain("END CERTIFICATE");
  });

  it("TOML: basic string escape", () => {
    expect(encodeForToml("simple")).toBe('"simple"');
    expect(encodeForToml('q"')).toBe('"q\\""');
    expect(encodeForToml("back\\slash")).toBe('"back\\\\slash"');
  });

  it("TOML: multi-line uses literal triple string", () => {
    const out = encodeForToml("line1\nline2");
    expect(out).toMatch(/^"""[\s\S]*"""$/);
  });
});
