import { describe, it, expect } from "vitest";
import { determineState, shouldEmitEvent, type StateContext } from "../../src/sync/state-machine.js";

describe("determineState", () => {
  it("missing: currentDigest is null", () => {
    const ctx: StateContext = {
      currentState: "missing",
      lastKnownDigest: "sha256-abc",
      currentDigest: null,
    };
    expect(determineState(ctx)).toBe("missing");
  });

  it("installed: lastKnownDigest is null, currentDigest is set (first install)", () => {
    const ctx: StateContext = {
      currentState: "installed",
      lastKnownDigest: null,
      currentDigest: "sha256-abc",
    };
    expect(determineState(ctx)).toBe("installed");
  });

  it("installed: current equals lastKnown", () => {
    const ctx: StateContext = {
      currentState: "installed",
      lastKnownDigest: "sha256-abc",
      currentDigest: "sha256-abc",
    };
    expect(determineState(ctx)).toBe("installed");
  });

  it("outdated: current differs from lastKnown, both non-null", () => {
    const ctx: StateContext = {
      currentState: "outdated",
      lastKnownDigest: "sha256-abc",
      currentDigest: "sha256-xyz",
    };
    expect(determineState(ctx)).toBe("outdated");
  });

  it("missing: both currentDigest and lastKnownDigest are null (never installed)", () => {
    const ctx: StateContext = {
      currentState: "missing",
      lastKnownDigest: null,
      currentDigest: null,
    };
    expect(determineState(ctx)).toBe("missing");
  });
});

describe("shouldEmitEvent", () => {
  it("install-failed: currentDigest is null and lastKnownDigest is set", () => {
    const ctx: StateContext = {
      currentState: "missing",
      lastKnownDigest: "sha256-abc",
      currentDigest: null,
    };
    expect(shouldEmitEvent(ctx)).toBe("install-failed");
  });

  it("null: currentDigest is null and lastKnownDigest is null (never installed)", () => {
    const ctx: StateContext = {
      currentState: "missing",
      lastKnownDigest: null,
      currentDigest: null,
    };
    expect(shouldEmitEvent(ctx)).toBeNull();
  });

  it("null: first install (lastKnownDigest null, currentDigest set)", () => {
    const ctx: StateContext = {
      currentState: "installed",
      lastKnownDigest: null,
      currentDigest: "sha256-abc",
    };
    expect(shouldEmitEvent(ctx)).toBeNull();
  });

  it("null: current equals lastKnown (no change)", () => {
    const ctx: StateContext = {
      currentState: "installed",
      lastKnownDigest: "sha256-abc",
      currentDigest: "sha256-abc",
    };
    expect(shouldEmitEvent(ctx)).toBeNull();
  });

  it("integrity-mismatch: current differs from lastKnown, both non-null", () => {
    const ctx: StateContext = {
      currentState: "outdated",
      lastKnownDigest: "sha256-abc",
      currentDigest: "sha256-xyz",
    };
    expect(shouldEmitEvent(ctx)).toBe("integrity-mismatch");
  });
});
