import { describe, it, expect } from "vitest";
import { computeDriftStatus, type DriftInput } from "../../src/sync/drift.js";

describe("computeDriftStatus", () => {
  const BASE_NODE = {
    source_digest: "sha256-src-abc",
    target_digest: "sha256-tgt-xyz",
  };

  it("none: both source and target match lock", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-abc",
      currentTargetDigest: "sha256-tgt-xyz",
    };
    expect(computeDriftStatus(input)).toBe("none");
  });

  it("source: source digest differs, target matches lock", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-CHANGED",
      currentTargetDigest: "sha256-tgt-xyz",
    };
    expect(computeDriftStatus(input)).toBe("source");
  });

  it("target: source matches lock, target digest differs", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-abc",
      currentTargetDigest: "sha256-tgt-CHANGED",
    };
    expect(computeDriftStatus(input)).toBe("target");
  });

  it("divergent: both source and target differ from lock", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-CHANGED",
      currentTargetDigest: "sha256-tgt-CHANGED",
    };
    expect(computeDriftStatus(input)).toBe("divergent");
  });

  it("divergent: currentTargetDigest is null + source also differs", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-CHANGED",
      currentTargetDigest: null,
    };
    expect(computeDriftStatus(input)).toBe("divergent");
  });

  it("target: currentTargetDigest is null but source matches lock", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-abc",
      currentTargetDigest: null,
    };
    expect(computeDriftStatus(input)).toBe("target");
  });
});
