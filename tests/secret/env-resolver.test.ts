import { describe, it, expect } from "vitest";
import { resolveEnv } from "../../src/secret/env-resolver.js";
import { parseExpression } from "../../src/secret/parser.js";

describe("resolveEnv", () => {
  const ctx = {
    projectRoot: "/tmp",
    env: { GITHUB_TOKEN: "ghp_abc", EMPTY: "", OTHER: "v" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "env.X",
  };

  it("E-4 present → value", () => {
    expect(resolveEnv(parseExpression("{env:GITHUB_TOKEN}"), ctx)).toBe("ghp_abc");
  });

  it("E-4 missing → ResolveError env-var-missing", () => {
    expect(() => resolveEnv(parseExpression("{env:NOT_SET}"), ctx)).toThrow(/env-var-missing/);
  });

  it("E-4 error message does NOT leak other env values (E-17)", () => {
    try {
      resolveEnv(parseExpression("{env:NOT_SET}"), ctx);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("ghp_abc");
    }
  });

  it("E-11 missing + default → default", () => {
    expect(resolveEnv(parseExpression("{env:NOT_SET:-fallback}"), ctx)).toBe("fallback");
  });

  it("E-11 empty string treated as missing when default given", () => {
    expect(resolveEnv(parseExpression("{env:EMPTY:-fallback}"), ctx)).toBe("fallback");
  });

  it("E-11 optional missing → empty string", () => {
    expect(resolveEnv(parseExpression("{env:NOT_SET?}"), ctx)).toBe("");
  });

  it("E-11 optional present → value", () => {
    expect(resolveEnv(parseExpression("{env:OTHER?}"), ctx)).toBe("v");
  });
});
