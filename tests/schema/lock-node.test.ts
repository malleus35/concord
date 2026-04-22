import { describe, expect, it } from "vitest";
import { LockNodeSchema } from "../../src/schema/lock-node.js";

const VALID = {
  id: "claude-code:skills:x",
  type: "skills",
  provider: "claude-code",
  source_digest: "sha256:" + "a".repeat(64),
  content_digest: "sha256:" + "b".repeat(64),
  catalog_digest: "sha256:" + "c".repeat(64),
  resolved_source: { type: "file", path: "/abs/x" },
  declared: { id: "claude-code:skills:x", source: { type: "file", path: "./x" } },
  install_mode: "copy",
  install_reason: "WindowsDefault",
  shell_compatibility: "na",
  drift_status: "none",
  raw_hash: "sha256:" + "d".repeat(64),
  normalized_hash: "sha256:" + "e".repeat(64),
  installed_at: "2026-04-22T10:00:00Z",
  install_path: "/home/alice/.claude/skills/x",
};

describe("LockNodeSchema", () => {
  it("accepts valid node", () => {
    const n = LockNodeSchema.parse(VALID);
    expect(n.id).toBe("claude-code:skills:x");
  });

  it("requires sha256:<64-hex> digest format", () => {
    expect(() =>
      LockNodeSchema.parse({ ...VALID, source_digest: "sha256:short" }),
    ).toThrow();
    expect(() =>
      LockNodeSchema.parse({ ...VALID, content_digest: "md5:abc" }),
    ).toThrow();
  });

  it("install_mode enum check", () => {
    for (const m of ["symlink", "hardlink", "copy"] as const) {
      expect(
        LockNodeSchema.parse({ ...VALID, install_mode: m }).install_mode,
      ).toBe(m);
    }
    expect(() =>
      LockNodeSchema.parse({ ...VALID, install_mode: "junction" }),
    ).toThrow();
  });

  it("drift_status enum check with env-drift", () => {
    for (const d of ["none", "source", "target", "divergent", "env-drift"] as const) {
      expect(
        LockNodeSchema.parse({ ...VALID, drift_status: d }).drift_status,
      ).toBe(d);
    }
  });

  it("optional dependencies + min_engine", () => {
    const n = LockNodeSchema.parse({
      ...VALID,
      dependencies: ["claude-code:plugins:helper"],
      min_engine: "2.0.0",
    });
    expect(n.dependencies).toEqual(["claude-code:plugins:helper"]);
  });
});
