import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createExternalFetcher } from "../../src/fetch/external.js";

describe("ExternalFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ef-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=external", () => {
    expect(createExternalFetcher().supports({ type: "external", command: "x", args: [] })).toBe(true);
  });

  it("echo → sha256 digest", async () => {
    const r = await createExternalFetcher().fetch(
      { type: "external", command: "echo", args: ["hi"] },
      { concordHome: tmp, cacheDir: tmp },
    );
    expect(r.sourceDigest).toMatch(/^sha256:/);
  });

  it("false → fetch-failed", async () => {
    await expect(
      createExternalFetcher().fetch(
        { type: "external", command: "false", args: [] },
        { concordHome: tmp, cacheDir: tmp },
      ),
    ).rejects.toMatchObject({ code: "fetch-failed" });
  });
});
