import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveFile } from "../../src/secret/file-resolver.js";
import { parseExpression } from "../../src/secret/parser.js";

describe("resolveFile", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-fr-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  const makeCtx = (root: string) => ({
    projectRoot: root,
    env: {} as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "env.CRED",
  });

  it("present UTF-8 file → content", async () => {
    const p = join(tmp, "cred.txt");
    await writeFile(p, "hello-token\n", "utf8");
    const res = resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp));
    expect(res).toBe("hello-token\n");
  });

  it("E-10 path traversal → path-traversal error", () => {
    expect(() =>
      resolveFile(parseExpression(`{file:../../etc/passwd}`), makeCtx(tmp)),
    ).toThrow(/path-traversal/);
  });

  it("missing file → file-not-found", () => {
    expect(() =>
      resolveFile(parseExpression(`{file:${join(tmp, "missing")}}`), makeCtx(tmp)),
    ).toThrow(/file-not-found/);
  });

  it("E-15 non-UTF8 binary → file-not-utf8 error", async () => {
    const p = join(tmp, "binary.bin");
    await writeFile(p, Buffer.from([0xff, 0xfe, 0xfd, 0xfc]));
    expect(() =>
      resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp)),
    ).toThrow(/file-not-utf8/);
  });

  it("E-15 BOM stripped from UTF-8", async () => {
    const p = join(tmp, "bom.txt");
    await writeFile(p, "﻿hello");
    const res = resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp));
    expect(res).toBe("hello");
  });

  it("E-11 default on missing file", () => {
    const res = resolveFile(
      parseExpression(`{file:${join(tmp, "none")}:-fallback}`),
      makeCtx(tmp),
    );
    expect(res).toBe("fallback");
  });
});
