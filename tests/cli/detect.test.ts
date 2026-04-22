import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunResult } from "../../src/utils/exec-file.js";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string): Promise<RunResult> => {
    if (cmd === "claude") return { stdout: "claude version 2.0.1\n", stderr: "", status: 0 };
    if (cmd === "codex") return { stdout: "", stderr: "cnf", status: null, errorCode: "ENOENT" };
    if (cmd === "opencode") return { stdout: "opencode v1.4.0\n", stderr: "", status: 0 };
    return { stdout: "", stderr: "unknown", status: 127 };
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("concord detect", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-detect-cli-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = tmp;
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("writes detect cache on success", async () => {
    const code = await runCli(["detect"]);
    expect(code).toBe(0);
    const cache = JSON.parse(await readFile(join(tmp, ".detect-cache.json"), "utf8"));
    expect(cache.agents["claude-code"].installed).toBe(true);
    expect(cache.agents["claude-code"].version).toBe("2.0.1");
    expect(cache.agents.codex.installed).toBe(false);
    expect(cache.agents.opencode.installed).toBe(true);
    expect(typeof cache.generated_at).toBe("string");
  });

  it("--json prints the cache to stdout", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = await runCli(["detect", "--json"]);
      expect(code).toBe(0);
      const combined = spy.mock.calls.map((c) => String(c[0])).join("");
      const parsed = JSON.parse(combined);
      expect(parsed.agents["claude-code"].installed).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
