import { describe, expect, it } from "vitest";
import { AssetBaseSchema } from "../../src/schema/asset-base.js";

const MIN = {
  id: "claude-code:skills:x",
  source: { type: "file", path: "./x" },
};

describe("AssetBaseSchema", () => {
  it("accepts minimal entry with defaults", () => {
    const parsed = AssetBaseSchema.parse(MIN);
    expect(parsed.install).toBe("auto"); // default
  });

  it("accepts install=symlink|hardlink|copy|auto", () => {
    for (const m of ["symlink", "hardlink", "copy", "auto"] as const) {
      expect(AssetBaseSchema.parse({ ...MIN, install: m }).install).toBe(m);
    }
  });

  it("rejects install=invalid", () => {
    expect(() => AssetBaseSchema.parse({ ...MIN, install: "junction" })).toThrow();
  });

  it("rejects bad id format (missing colon)", () => {
    expect(() =>
      AssetBaseSchema.parse({ ...MIN, id: "invalid_id_no_colon" }),
    ).toThrow();
  });

  it("accepts target=shared-agents (결정 A)", () => {
    expect(
      AssetBaseSchema.parse({ ...MIN, target: "shared-agents" }).target,
    ).toBe("shared-agents");
  });

  it("passthrough unknown fields (Π2 하위 원칙)", () => {
    const parsed = AssetBaseSchema.parse({ ...MIN, future_field: "xyz" }) as {
      future_field?: string;
    };
    expect(parsed.future_field).toBe("xyz");
  });
});
