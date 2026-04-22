import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord update", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-update-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    await mkdir(process.env.CONCORD_HOME, { recursive: true });
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("runs update with no assets → exit 0", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["update", "--manifest", m, "--lock", l]);
    expect(code).toBe(0);
  });

  it("--json outputs a parseable object", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    };
    try {
      const code = await runCli(["update", "--manifest", m, "--lock", l, "--json"]);
      expect(code).toBe(0);
    } finally {
      process.stdout.write = origWrite;
    }
    const combined = chunks.join("");
    const parsed = JSON.parse(combined);
    expect(parsed.plan).toBeDefined();
  });

  it("filters by id when <id> passed (parse succeeds)", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["update", "claude-code:skills:foo", "--manifest", m, "--lock", l]);
    // no matching entries → plan has 0 actions → exit 0
    expect(code).toBe(0);
  });

  it("invalid manifest → exit 1", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `skills: not-a-list\n`);
    const code = await runCli(["update", "--manifest", m, "--lock", l]);
    expect(code).toBe(1);
  });
});
