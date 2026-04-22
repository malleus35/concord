import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord why", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-why-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("prints entry info for a root node", async () => {
    const lock = join(tmp, "concord.lock");
    await writeFile(lock, JSON.stringify({
      lockfile_version: 1,
      roots: ["claude-code:skills:foo"],
      nodes: {
        "claude-code:skills:foo": {
          target_path: "/t/foo",
          source_digest: "sha256:aaa",
          content_digest: "sha256:bbb",
        },
      },
    }));
    const chunks: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    };
    try {
      const code = await runCli(["why", "claude-code:skills:foo", "--lock", lock]);
      expect(code).toBe(0);
      const out = chunks.join("");
      expect(out).toContain("claude-code:skills:foo");
      expect(out).toContain("/t/foo");
      expect(out).toContain("sha256:bbb");
      expect(out).toContain("root: true");
    } finally {
      process.stdout.write = orig;
    }
  });

  it("exits 1 for unknown id", async () => {
    const lock = join(tmp, "concord.lock");
    await writeFile(lock, JSON.stringify({ lockfile_version: 1, roots: [], nodes: {} }));
    const code = await runCli(["why", "missing", "--lock", lock]);
    expect(code).toBe(1);
  });

  it("reports transitive parents when dependencies link the id", async () => {
    const lock = join(tmp, "concord.lock");
    await writeFile(lock, JSON.stringify({
      lockfile_version: 1,
      roots: ["claude-code:plugins:bundle"],
      nodes: {
        "claude-code:plugins:bundle": {
          target_path: "/p/bundle",
          dependencies: ["claude-code:skills:child"],
        },
        "claude-code:skills:child": {
          target_path: "/p/child",
          source_digest: "sha256:ccc",
        },
      },
    }));
    const chunks: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    };
    try {
      const code = await runCli(["why", "claude-code:skills:child", "--lock", lock]);
      expect(code).toBe(0);
      const out = chunks.join("");
      expect(out).toContain("root: false");
      expect(out).toContain("transitively required by: claude-code:plugins:bundle");
    } finally {
      process.stdout.write = orig;
    }
  });
});
