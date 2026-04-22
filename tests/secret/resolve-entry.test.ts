import { describe, it, expect } from "vitest";
import { resolveEntry } from "../../src/secret/resolve-entry.js";

const BASE_CTX = {
  projectRoot: "/tmp",
  env: { BASE: "https://api", TOKEN: "ghp_x", VERSION: "v1" } as Record<string, string | undefined>,
  provider: "claude-code" as const,
  assetType: "mcp_servers" as const,
  fieldPath: "entry",
};

describe("resolveEntry", () => {
  it("resolves allowed fields (source.url / env)", () => {
    const entry = {
      id: "mcp_servers:airtable",
      source: { type: "http", url: "{env:BASE}/airtable.tgz", sha256: "sha256:abc" },
      env: { AIRTABLE_TOKEN: "{env:TOKEN}" },
    };
    const r = resolveEntry(entry, BASE_CTX);
    expect((r.entry.source as any).url).toBe("https://api/airtable.tgz");
    expect((r.entry.env as any).AIRTABLE_TOKEN).toBe("ghp_x");
    // id is identity field (E-7 NOT allowed) — untouched
    expect(r.entry.id).toBe("mcp_servers:airtable");
  });

  it("id field with interpolation → UNCHANGED (E-7 rejects but parser should skip identity fields)", () => {
    const entry = { id: "x:y", command: "{env:BASE}" };
    const r = resolveEntry(entry, BASE_CTX);
    expect(r.entry.command).toBe("{env:BASE}"); // command NOT in allowlist
  });

  it("E-5 OpenCode provider → passthrough (no interpolation)", () => {
    const entry = {
      id: "mcp_servers:foo",
      source: { type: "http", url: "{env:BASE}/x", sha256: "sha256:abc" },
    };
    const r = resolveEntry(entry, { ...BASE_CTX, provider: "opencode" });
    expect((r.entry.source as any).url).toBe("{env:BASE}/x"); // unchanged
    expect(r.resolvedFields.size).toBe(0);
  });

  it("envDigest stable for same inputs", () => {
    const entry = { id: "x:y", source: { url: "{env:BASE}/x", type: "http", sha256: "sha256:abc" } };
    const r1 = resolveEntry(entry, BASE_CTX);
    const r2 = resolveEntry(entry, BASE_CTX);
    expect(r1.envDigest).toBe(r2.envDigest);
  });

  it("envDigest changes when env value changes", () => {
    const entry = { id: "x:y", source: { url: "{env:BASE}/x", type: "http", sha256: "sha256:abc" } };
    const r1 = resolveEntry(entry, BASE_CTX);
    const r2 = resolveEntry(entry, { ...BASE_CTX, env: { ...BASE_CTX.env, BASE: "https://OTHER" } });
    expect(r1.envDigest).not.toBe(r2.envDigest);
  });

  it("missing env required → throws at fieldPath", () => {
    const entry = {
      id: "x:y",
      source: { type: "http", url: "{env:NOT_SET}", sha256: "sha256:abc" },
    };
    expect(() => resolveEntry(entry, BASE_CTX)).toThrow(/env-var-missing/);
  });
});
