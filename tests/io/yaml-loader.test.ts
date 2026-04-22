import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { loadYaml } from "../../src/io/yaml-loader.js";

const FIXTURE = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");

describe("loadYaml", () => {
  it("parses fixture into object", () => {
    const data = loadYaml(FIXTURE) as {
      concord_version: string;
      skills: Array<{ id: string }>;
    };
    expect(data.concord_version).toBe(">=0.1");
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0]?.id).toBe("claude-code:skills:commit-msg");
  });

  it("throws on non-existent file", () => {
    expect(() => loadYaml("/nonexistent/x.yaml")).toThrow();
  });

  it("throws on invalid YAML", () => {
    const bad = path.resolve(__dirname, "../fixtures/invalid.yaml");
    expect(() => loadYaml(bad)).toThrow();
  });
});
