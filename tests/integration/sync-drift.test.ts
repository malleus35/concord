import { describe, it, expect } from "vitest";
import { computeDriftStatus } from "../../src/sync/drift.js";

describe("E2E: drift scenarios", () => {
  const node = { source_digest: "sha256:a", target_digest: "sha256:b" };
  it("initial → none", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:a", currentTargetDigest: "sha256:b" })).toBe("none"); });
  it("upstream bump → source", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:n", currentTargetDigest: "sha256:b" })).toBe("source"); });
  it("user edit → target", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:a", currentTargetDigest: "sha256:e" })).toBe("target"); });
  it("both → divergent", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:n", currentTargetDigest: "sha256:e" })).toBe("divergent"); });
});
