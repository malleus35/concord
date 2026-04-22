import { describe, expect, it } from "vitest";
import {
  SkillAssetSchema,
  checkSkillsPlacement,
} from "../../../src/schema/assets/skill.js";

const MIN_SKILL = {
  id: "claude-code:skills:commit-msg",
  source: { type: "file", path: "./skills/commit-msg" },
};

describe("SkillAssetSchema", () => {
  it("accepts minimal skill entry", () => {
    expect(SkillAssetSchema.parse(MIN_SKILL).id).toBe(
      "claude-code:skills:commit-msg",
    );
  });

  it("accepts type=skills literal", () => {
    expect(SkillAssetSchema.parse({ ...MIN_SKILL, type: "skills" }).type).toBe(
      "skills",
    );
  });
});

describe("checkSkillsPlacement (결정 A A1/A4)", () => {
  it("rejects claude-code + shared-agents (A1/A4)", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          ...MIN_SKILL,
          id: "claude-code:skills:x",
          target: "shared-agents",
        },
      ]),
    ).toThrow(/shared-agents.*claude-code/i);
  });

  it("accepts codex + shared-agents", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          id: "codex:skills:x",
          source: { type: "file", path: "./x" },
          install: "auto",
          target: "shared-agents",
        },
      ]),
    ).not.toThrow();
  });

  it("accepts opencode + shared-agents", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          id: "opencode:skills:x",
          source: { type: "file", path: "./x" },
          install: "auto",
          target: "shared-agents",
        },
      ]),
    ).not.toThrow();
  });
});
