import { describe, expect, it } from "vitest";
import {
  ConfigScope,
  AssetType,
  Provider,
  SCOPE_PRECEDENCE,
} from "../../src/schema/types.js";

describe("ConfigScope", () => {
  it("has 4 canonical scopes", () => {
    expect(ConfigScope.enum).toStrictEqual({
      enterprise: "enterprise",
      user: "user",
      project: "project",
      local: "local",
    });
  });
});

describe("AssetType", () => {
  it("has 6 canonical asset types (β3 restoration)", () => {
    expect(Object.keys(AssetType.enum).sort()).toStrictEqual(
      ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"].sort()
    );
  });
});

describe("Provider", () => {
  it("has 3 supported providers", () => {
    expect(Object.keys(Provider.enum).sort()).toStrictEqual(
      ["claude-code", "codex", "opencode"].sort()
    );
  });
});

describe("SCOPE_PRECEDENCE", () => {
  it("orders enterprise → user → project → local (§11.5)", () => {
    expect(SCOPE_PRECEDENCE).toStrictEqual([
      "enterprise",
      "user",
      "project",
      "local",
    ]);
  });
});
