import { describe, expect, it } from "vitest";
import { LockSchema } from "../../src/schema/lock.js";

const NODE = {
  id: "x",
  type: "skills",
  provider: "claude-code",
  source_digest: "sha256:" + "a".repeat(64),
  content_digest: "sha256:" + "b".repeat(64),
  catalog_digest: "sha256:" + "c".repeat(64),
  resolved_source: { type: "file", path: "/abs/x" },
  declared: { id: "x", source: { type: "file", path: "./x" } },
  install_mode: "copy",
  install_reason: "Auto",
  shell_compatibility: "na",
  drift_status: "none",
  raw_hash: "sha256:" + "d".repeat(64),
  normalized_hash: "sha256:" + "e".repeat(64),
  installed_at: "2026-04-22T10:00:00Z",
  install_path: "/home/alice/.claude/skills/x",
};

// CapabilityMatrixSchema (Zod 4 z.record(enum,...)) 는 모든 provider/assetType 를
// 강제한다 — 아래 fixture 는 단순히 스키마 통과 목적. skills 만 supported, 나머지는
// na 로 채워 최소 유효 shape 을 구성.
const naCell = { status: "na", reason: "AssetTypeNotApplicable" } as const;
const fullMatrixForProvider = {
  skills: { status: "supported", count: 1, drift_status: "none" },
  subagents: naCell,
  hooks: naCell,
  mcp_servers: naCell,
  instructions: naCell,
  plugins: naCell,
};

const BASE = {
  lockfile_version: 1,
  generated_at: "2026-04-22T10:00:00Z",
  generated_by: "concord@0.1.0",
  scope: "project",
  roots: ["x"],
  nodes: { x: NODE },
  capability_matrix: {
    "claude-code": fullMatrixForProvider,
    codex: fullMatrixForProvider,
    opencode: fullMatrixForProvider,
  },
};

describe("LockSchema", () => {
  it("accepts valid minimal lock", () => {
    expect(LockSchema.parse(BASE).lockfile_version).toBe(1);
  });

  it("rejects lockfile_version !== 1", () => {
    expect(() => LockSchema.parse({ ...BASE, lockfile_version: 2 })).toThrow();
  });

  it("phase2_projections is optional (Phase 1 unused)", () => {
    const lock = LockSchema.parse(BASE);
    expect(lock.phase2_projections).toBeUndefined();
  });

  it("accepts phase2_projections if provided (Phase 2 forward compat)", () => {
    const lock = LockSchema.parse({
      ...BASE,
      phase2_projections: { some_future_key: {} },
    });
    expect(lock.phase2_projections).toEqual({ some_future_key: {} });
  });

  describe("§7.3.1 symlink drift cross-validation (refine)", () => {
    it("rejects install_mode=symlink + drift_status=target", () => {
      const badNode = { ...NODE, install_mode: "symlink", drift_status: "target" };
      expect(() =>
        LockSchema.parse({ ...BASE, nodes: { x: badNode } }),
      ).toThrow(/symlink.*drift/i);
    });

    it("rejects install_mode=symlink + drift_status=divergent", () => {
      const badNode = { ...NODE, install_mode: "symlink", drift_status: "divergent" };
      expect(() =>
        LockSchema.parse({ ...BASE, nodes: { x: badNode } }),
      ).toThrow(/symlink.*drift/i);
    });

    it("allows install_mode=symlink + drift_status ∈ {none, source, env-drift}", () => {
      for (const d of ["none", "source", "env-drift"] as const) {
        const goodNode = { ...NODE, install_mode: "symlink", drift_status: d };
        expect(() =>
          LockSchema.parse({ ...BASE, nodes: { x: goodNode } }),
        ).not.toThrow();
      }
    });

    it("allows install_mode=copy + any drift_status", () => {
      for (const d of ["none", "source", "target", "divergent", "env-drift"] as const) {
        const goodNode = { ...NODE, install_mode: "copy", drift_status: d };
        expect(() =>
          LockSchema.parse({ ...BASE, nodes: { x: goodNode } }),
        ).not.toThrow();
      }
    });
  });
});
