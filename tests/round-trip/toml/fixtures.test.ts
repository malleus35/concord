import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/toml");
const SCENARIOS = [
  "01-add-entry.toml",
  "02-modify-value.toml",
  "03-delete-entry.toml",
  "04-array-of-tables.toml",
  "05-inline-table.toml",
  "06-multiline-array.toml",
  "07-crlf.toml",
  "08-bom.toml",
  "09-large.toml",
  "10-marker-block.toml",
];

describe("round-trip/toml fixtures", () => {
  it.each(SCENARIOS)("fixture %s 존재 + 읽기 가능", (name) => {
    const content = readFileSync(join(FIXTURE_DIR, name));
    expect(content.length).toBeGreaterThan(0);
  });

  it("scenarios.json 에 10 시나리오 spec 정의", () => {
    const spec = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"));
    expect(spec.scenarios).toHaveLength(10);
    for (const s of spec.scenarios) {
      expect(s).toHaveProperty("fixture");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("edits");
    }
  });

  it("07-crlf.toml 은 CRLF 개행 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "07-crlf.toml"));
    expect(content.includes(Buffer.from("\r\n"))).toBe(true);
  });

  it("08-bom.toml 은 UTF-8 BOM 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "08-bom.toml"));
    expect(content[0]).toBe(0xef);
    expect(content[1]).toBe(0xbb);
    expect(content[2]).toBe(0xbf);
  });

  it("09-large.toml 은 > 100KB", () => {
    const content = readFileSync(join(FIXTURE_DIR, "09-large.toml"));
    expect(content.length).toBeGreaterThan(100 * 1024);
  });

  it("10-marker-block.toml 은 concord-managed marker 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "10-marker-block.toml"), "utf8");
    expect(content).toContain(">>>> concord-managed:");
    expect(content).toContain("<<<< concord-managed:");
  });
});
