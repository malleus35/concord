import { describe, expect, it } from "vitest";
import { validateLock } from "../../src/schema/validate-lock.js";

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
// 강제한다 — fixture 를 full 3×6 shape 으로 확장 (Task 21 선례).
const naCell = { status: "na", reason: "AssetTypeNotApplicable" } as const;
const fullMatrixForProvider = {
  skills: { status: "supported", count: 1, drift_status: "none" },
  subagents: naCell,
  hooks: naCell,
  mcp_servers: naCell,
  instructions: naCell,
  plugins: naCell,
};

const VALID = {
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

describe("validateLock", () => {
  it("accepts valid lock", () => {
    expect(validateLock(VALID).lockfile_version).toBe(1);
  });

  it("I5 secret leak: resolved env value in declared → throw", () => {
    const leaky = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            env: { GITHUB_TOKEN: "ghp_abcdef1234567890" },
          },
        },
      },
    };
    expect(() => validateLock(leaky)).toThrow(/secret/i);
  });

  it("I5 allows unresolved expression in declared", () => {
    const ok = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            env: { GITHUB_TOKEN: "{env:GITHUB_TOKEN}" },
          },
        },
      },
    };
    expect(() => validateLock(ok)).not.toThrow();
  });

  it("I6 Plugin intact: declared passthrough preserved as-is", () => {
    const withExtra = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            future_author_field: { nested: "value" },
          },
        },
      },
    };
    const lock = validateLock(withExtra);
    const node = lock.nodes["x"];
    expect(node).toBeDefined();
    expect(
      (node!.declared as { future_author_field?: unknown }).future_author_field,
    ).toEqual({ nested: "value" });
  });

  it("rejects lockfile_version != 1 (fail-closed)", () => {
    expect(() => validateLock({ ...VALID, lockfile_version: 2 })).toThrow(
      /lockfile_version/,
    );
  });
});
