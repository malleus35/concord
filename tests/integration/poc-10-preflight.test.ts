import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunResult } from "../../src/utils/exec-file.js";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string, args: readonly string[]): Promise<RunResult> => {
    if (cmd === "codex" && args[0] === "--version") {
      return { stdout: "codex 0.118.0\n", stderr: "", status: 0 };
    }
    return { stdout: "", stderr: "", status: 1 };
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("POC-10 doctor preflight edges", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-poc10-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("doctor --json emits checks object including codexVersion", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    };
    try {
      const code = await runCli(["doctor", "--manifest", manifest, "--json"]);
      expect(code).toBe(0);
    } finally {
      process.stdout.write = origWrite;
    }
    const combined = chunks.join("");
    const parsed = JSON.parse(combined);
    expect(parsed.checks).toBeDefined();
    expect(parsed.checks.codexVersion).toBeDefined();
    expect(parsed.checks.gitBash).toBeDefined();
    expect(parsed.checks.platformWarnings).toBeDefined();
    // Mock injected "0.118.0"; preflight should reflect that somewhere in the version field
    expect(JSON.stringify(parsed.checks.codexVersion)).toContain("0.118");
  });
});
