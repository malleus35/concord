import { describe, it, expect } from "vitest";
import { computeEnvDrift } from "../../src/sync/env-drift.js";

describe("computeEnvDrift", () => {
  const BASE_CTX = {
    projectRoot: "/tmp",
    env: { X: "1" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "x",
  };

  it("entry without interpolation → no drift", () => {
    const r = computeEnvDrift(
      { id: "x:y", source: { type: "http", url: "https://static", sha256: "sha256:x" } },
      { env_digest: "sha256:cafe" },
      BASE_CTX,
    );
    expect(r.hasDrift).toBe(false);
  });

  it("env changed → hasDrift true", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:X}/api", sha256: "sha256:x" } };
    const r = computeEnvDrift(
      entry,
      { env_digest: "sha256:outdated" },
      BASE_CTX,
    );
    expect(r.hasDrift).toBe(true);
    expect(r.currentDigest).toMatch(/^sha256:/);
  });

  it("lock without env_digest → skip (backward compat)", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:X}/api", sha256: "sha256:x" } };
    const r = computeEnvDrift(entry, {}, BASE_CTX);
    expect(r.hasDrift).toBe(false);
  });
});
