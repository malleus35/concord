import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/jsonc");
const SCENARIOS = [
  "01-comments.jsonc",
  "02-trailing-comma.jsonc",
  "03-add-key.jsonc",
  "04-modify-value.jsonc",
  "05-delete-key.jsonc",
  "06-marker-block.jsonc",
  "07-pure-json.json",
  "08-large.jsonc",
];

describe("round-trip/jsonc fixtures", () => {
  it.each(SCENARIOS)("fixture %s 존재", (name) => {
    const content = readFileSync(join(FIXTURE_DIR, name));
    expect(content.length).toBeGreaterThan(0);
  });

  it("scenarios.json 에 8 시나리오", () => {
    const spec = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"));
    expect(spec.scenarios).toHaveLength(8);
  });

  it("01-comments.jsonc 는 line + block + inline 주석 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "01-comments.jsonc"), "utf8");
    expect(content).toContain("//");
    expect(content).toContain("/*");
  });

  it("02-trailing-comma.jsonc 는 trailing comma 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "02-trailing-comma.jsonc"), "utf8");
    expect(content).toMatch(/,\s*[}\]]/);
  });

  it("06-marker-block.jsonc 는 concord-managed marker 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "06-marker-block.jsonc"), "utf8");
    expect(content).toContain(">>>> concord-managed:");
  });

  it("07-pure-json.json 은 주석 없음 (strict JSON)", () => {
    const content = readFileSync(join(FIXTURE_DIR, "07-pure-json.json"), "utf8");
    expect(content).not.toContain("//");
    expect(content).not.toContain("/*");
    // strict JSON 파싱 성공
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("08-large.jsonc 는 > 50KB", () => {
    const content = readFileSync(join(FIXTURE_DIR, "08-large.jsonc"));
    expect(content.length).toBeGreaterThan(50 * 1024);
  });
});
