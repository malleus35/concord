import { describe, expect, it } from "vitest";
import { InstructionAssetSchema } from "../../../src/schema/assets/instruction.js";

const BASE = {
  id: "claude-code:instructions:claude-md",
  source: { type: "file", path: "./CLAUDE.md" },
};

describe("InstructionAssetSchema", () => {
  it.each(["claude-md", "agents-md", "opencode-instructions"])(
    "accepts target=%s",
    (target) => {
      expect(
        InstructionAssetSchema.parse({ ...BASE, target }).target,
      ).toBe(target);
    },
  );

  it("rejects target=unknown", () => {
    expect(() =>
      InstructionAssetSchema.parse({ ...BASE, target: "readme" }),
    ).toThrow();
  });

  it.each(["file-include", "layered-concat", "array-entry"])(
    "accepts mode=%s",
    (mode) => {
      expect(
        InstructionAssetSchema.parse({
          ...BASE,
          target: "claude-md",
          mode,
        }).mode,
      ).toBe(mode);
    },
  );
});
