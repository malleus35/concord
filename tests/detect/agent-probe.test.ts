import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RunResult } from "../../src/utils/exec-file.js";

// Fixtures exercise a spectrum of real-world --version formats:
// - Plain "<name> x.y.z\n" / "v" prefix / build metadata
// - Non-semver stdout (installed:true but version:null)
// - Non-zero exit (installed:false)
// - ENOENT via status:null
//
// vi.mock factory is hoisted above const declarations, so fixtures live inline and
// per-test overrides flow through globalThis (read lazily on every runCommand call).
vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string): Promise<RunResult> => {
    const defaults: Record<string, RunResult> = {
      claude:   { stdout: "claude version 2.0.1 (build abc123)\n", stderr: "", status: 0 },
      codex:    { stdout: "codex v0.119.0\n", stderr: "", status: 0 },
      opencode: { stdout: "", stderr: "cnf", status: null, errorCode: "ENOENT" },
    };
    const o = (globalThis as Record<string, unknown>)["__PROBE_OVERRIDES__"] as Record<string, RunResult> | undefined;
    return o?.[cmd] ?? defaults[cmd] ?? { stdout: "", stderr: "", status: 127 };
  }),
}));

import { probeAgent } from "../../src/detect/agent-probe.js";

beforeEach(() => {
  (globalThis as Record<string, unknown>)["__PROBE_OVERRIDES__"] = {};
});

describe("agent probe", () => {
  it("installed agent returns version + installed:true", async () => {
    const info = await probeAgent("claude-code");
    expect(info.installed).toBe(true);
    expect(info.version).toBe("2.0.1");
  });

  it("missing agent returns installed:false", async () => {
    const info = await probeAgent("opencode");
    expect(info.installed).toBe(false);
    expect(info.version).toBeNull();
  });

  it("parses 'v' prefix format", async () => {
    const info = await probeAgent("codex");
    expect(info.installed).toBe(true);
    expect(info.version).toBe("0.119.0");
  });

  it("installed agent with unparseable stdout returns version:null (not empty string)", async () => {
    (globalThis as any).__PROBE_OVERRIDES__ = { claude: { stdout: "claude (no version)\n", stderr: "", status: 0 } };
    const info = await probeAgent("claude-code");
    expect(info.installed).toBe(true);
    expect(info.version).toBeNull();
  });

  it("non-zero exit returns installed:false (even when binary exists)", async () => {
    (globalThis as any).__PROBE_OVERRIDES__ = { claude: { stdout: "", stderr: "fatal", status: 1 } };
    const info = await probeAgent("claude-code");
    expect(info.installed).toBe(false);
    expect(info.version).toBeNull();
  });
});
