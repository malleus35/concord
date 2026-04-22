import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAudit } from "../../src/audit/log.js";

describe("audit log", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-audit-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("appends a JSON line to audit.log", async () => {
    await appendAudit(tmp, { action: "secret-debug", env: "GITHUB_TOKEN" });
    const contents = await readFile(join(tmp, "audit.log"), "utf8");
    const line = JSON.parse(contents.trim());
    expect(line.action).toBe("secret-debug");
    expect(line.env).toBe("GITHUB_TOKEN");
    expect(typeof line.timestamp).toBe("string");
    // E-17: resolved value 절대 로깅 금지
    expect(line.resolved).toBeUndefined();
    expect(line.value).toBeUndefined();
  });

  it("refuses entry containing reserved resolved fields", async () => {
    await expect(
      appendAudit(tmp, { action: "x", resolved: "secret" } as any),
    ).rejects.toThrow(/resolved/);
  });
});
