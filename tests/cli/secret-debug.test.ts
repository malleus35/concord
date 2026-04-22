import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord secret debug", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-secret-debug-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = tmp;
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    delete process.env.TEST_SECRET_FOR_DEBUG;
    await rm(tmp, { recursive: true, force: true });
  });

  it("refuses to run non-interactively even when env is set", async () => {
    process.env.TEST_SECRET_FOR_DEBUG = "ghp_realsecret";
    const code = await runCli(["secret", "debug", "--env", "TEST_SECRET_FOR_DEBUG"]);
    expect(code).toBe(1);
  });

  it("refuses --json output (interactive-only)", async () => {
    const code = await runCli(["secret", "debug", "--env", "X", "--json"]);
    expect(code).toBe(1);
  });
});
