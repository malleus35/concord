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
      currentEnvDigest: "sha256-env-1",
      lockEnvDigest: "sha256-env-1",
    };
    expect(computeDriftStatus(input)).toBe("none");
  });

  it("source drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("source");
  });

  it("target drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-CHANGED",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("target");
  });

  it("divergent", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-CHANGED",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("divergent");
  });

  it("env drift: source+target match lock but env value changed", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "sha256-env-NEW",
        lockEnvDigest: "sha256-env-OLD",
      }),
    ).toBe("env");
  });

  it("env drift precedence: source drift wins over env drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "sha256-env-NEW",
        lockEnvDigest: "sha256-env-OLD",
      }),
    ).toBe("source");
  });

  it("currentTargetDigest null + sources match → target", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: null,
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("target");
  });

  it("lockEnvDigest undefined → skip env check", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "e",
        // lockEnvDigest omitted → backward compat, no env-drift
      }),
    ).toBe("none");
  });
});
