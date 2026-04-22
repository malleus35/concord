import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeDetectCache, readDetectCache } from "../../src/detect/cache.js";

describe("detect cache", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-detect-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("round-trip write → read", async () => {
    const cache = {
      generated_at: "2026-04-22T00:00:00Z",
      agents: {
        "claude-code": { installed: true, version: "2.0.1", path: null },
        codex: { installed: false, version: null, path: null },
        opencode: { installed: true, version: "1.4.0", path: null },
      },
    } as const;
    await writeDetectCache(tmp, cache as any);
    const got = await readDetectCache(tmp);
    expect(got).toEqual(cache);
  });

  it("returns null if cache missing", async () => {
    const got = await readDetectCache(tmp);
    expect(got).toBeNull();
  });
});
