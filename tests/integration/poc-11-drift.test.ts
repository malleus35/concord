import { describe, it, expect } from "vitest";
import { computeDriftStatus } from "../../src/sync/drift.js";

describe("POC-11 drift 5-state edges", () => {
  it("source_digest mismatch + target match → source", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:bbb",
      currentTargetDigest: "sha256:ccc",
    });
    expect(s).toBe("source");
  });

  it("source match + target mismatch → target", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:aaa",
      currentTargetDigest: "sha256:ddd",
    });
    expect(s).toBe("target");
  });

  it("both mismatch → divergent", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:bbb",
      currentTargetDigest: "sha256:ddd",
    });
    expect(s).toBe("divergent");
  });

  it("both match, no env digests → none", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:aaa",
      currentTargetDigest: "sha256:ccc",
    });
    expect(s).toBe("none");
  });

  it("both match + env digest differs → env", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:aaa",
      currentTargetDigest: "sha256:ccc",
      lockEnvDigest: "sha256:e1",
      currentEnvDigest: "sha256:e2",
    });
    expect(s).toBe("env");
  });

  it("both match + env digests equal → none", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:aaa",
      currentTargetDigest: "sha256:ccc",
      lockEnvDigest: "sha256:e1",
      currentEnvDigest: "sha256:e1",
    });
    expect(s).toBe("none");
  });

  it("legacy lock (no env digests) + source/target match → none", () => {
    const s = computeDriftStatus({
      node: { source_digest: "sha256:aaa", target_digest: "sha256:ccc" },
      currentSourceDigest: "sha256:aaa",
      currentTargetDigest: "sha256:ccc",
    });
    expect(s).toBe("none");
  });
});
