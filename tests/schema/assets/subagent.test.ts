import { describe, expect, it } from "vitest";
import { SubagentAssetSchema } from "../../../src/schema/assets/subagent.js";

const BASE = {
  id: "claude-code:subagents:reviewer",
  source: { type: "file", path: "./agents/reviewer.md" },
};

describe("SubagentAssetSchema", () => {
  it("accepts minimal entry", () => {
    expect(SubagentAssetSchema.parse(BASE).id).toBe(
      "claude-code:subagents:reviewer",
    );
  });

  it("accepts format=md-yaml|toml", () => {
    expect(SubagentAssetSchema.parse({ ...BASE, format: "md-yaml" }).format)
      .toBe("md-yaml");
    expect(
      SubagentAssetSchema.parse({
        id: "codex:subagents:r",
        source: { type: "file", path: "./r.toml" },
        format: "toml",
      }).format,
    ).toBe("toml");
  });

  it("rejects format=markdown (unknown)", () => {
    expect(() =>
      SubagentAssetSchema.parse({ ...BASE, format: "markdown" }),
    ).toThrow();
  });
});
