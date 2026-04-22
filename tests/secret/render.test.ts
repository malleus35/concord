import { describe, it, expect } from "vitest";
import { renderString } from "../../src/secret/render.js";

describe("renderString", () => {
  const ctx = {
    projectRoot: "/tmp",
    env: { BASE: "https://api.example.com", VERSION: "v1", TOKEN: "t" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "source.url",
  };

  it("no interpolation → passthrough", () => {
    expect(renderString("literal text", ctx)).toBe("literal text");
  });

  it("single env expression", () => {
    expect(renderString("{env:BASE}", ctx)).toBe("https://api.example.com");
  });

  it("multiple expressions in one string", () => {
    expect(renderString("{env:BASE}/api/{env:VERSION}/x", ctx)).toBe(
      "https://api.example.com/api/v1/x",
    );
  });

  it("E-13 escape {{...}} → literal {...}", () => {
    expect(renderString("Use {{env:FOO}} syntax", ctx)).toBe("Use {env:FOO} syntax");
  });

  it("E-13 escape + real expression mixed", () => {
    expect(renderString("{{env:LITERAL}} and {env:BASE}", ctx)).toBe(
      "{env:LITERAL} and https://api.example.com",
    );
  });

  it("E-9 nested → nested-interpolation error", () => {
    expect(() => renderString("{env:PREFIX_{env:VERSION}}", ctx)).toThrow(/nested-interpolation/);
  });

  it("E-14 1-depth: file content not re-scanned for env", () => {
    const ctx2 = { ...ctx, env: { ...ctx.env, HAS_TMPL: "{env:BASE}" } };
    expect(renderString("{env:HAS_TMPL}", ctx2)).toBe("{env:BASE}");
  });
});
