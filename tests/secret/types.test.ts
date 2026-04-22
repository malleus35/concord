import { describe, it, expect } from "vitest";
import {
  makeResolveError,
  type ResolverContext,
  type ResolvedEntry,
} from "../../src/secret/types.js";

describe("secret/types", () => {
  it("makeResolveError: code + name + E-17 resolved redaction", () => {
    const e = makeResolveError(
      "env-var-missing",
      "GITHUB_TOKEN not set",
      "{env:GITHUB_TOKEN}",
    );
    expect(e.code).toBe("env-var-missing");
    expect(e.name).toBe("ResolveError");
    expect(e.expression).toBe("{env:GITHUB_TOKEN}");
    // E-17: message must NOT contain resolved value
    expect(e.message).not.toContain("ghp_");
  });

  it("ResolverContext shape compiles", () => {
    const ctx: ResolverContext = {
      projectRoot: "/tmp/proj",
      env: { X: "1" },
      provider: "claude-code",
      assetType: "skills",
      fieldPath: "source.url",
    };
    expect(ctx.provider).toBe("claude-code");
  });

  it("ResolvedEntry shape compiles", () => {
    const r: ResolvedEntry = {
      entry: { id: "skills:x" },
      envDigest: "sha256:abc",
      resolvedFields: new Map([["source.url", "https://x"]]),
    };
    expect(r.envDigest).toMatch(/^sha256:/);
  });
});
