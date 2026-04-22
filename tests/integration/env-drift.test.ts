import { describe, it, expect } from "vitest";
import { computeEnvDrift } from "../../src/sync/env-drift.js";

describe("E2E: env-drift (E-2a)", () => {
  const CTX = {
    projectRoot: "/tmp",
    env: { VAR: "v1" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "entry",
  };

  it("initial install → no drift", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:VAR}/api", sha256: "sha256:x" } };
    const first = computeEnvDrift(entry, {}, CTX);
    expect(first.hasDrift).toBe(false);
    // After writing first.currentDigest to lock, next run with same env → no drift
    const second = computeEnvDrift(entry, { env_digest: first.currentDigest }, CTX);
    expect(second.hasDrift).toBe(false);
  });

  it("env value changes → drift detected", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:VAR}/api", sha256: "sha256:x" } };
    const initial = computeEnvDrift(entry, {}, CTX);
    const ctx2 = { ...CTX, env: { VAR: "v2" } };
    const later = computeEnvDrift(entry, { env_digest: initial.currentDigest }, ctx2);
    expect(later.hasDrift).toBe(true);
  });
});
