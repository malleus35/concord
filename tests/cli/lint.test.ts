import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { runCli } from "../../src/cli/index.js";

const VALID = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");
const RESERVED = path.resolve(__dirname, "../fixtures/manifest-reserved.yaml");
const CASE_COLLISION = path.resolve(
  __dirname,
  "../fixtures/manifest-case-collision.yaml",
);

describe("concord lint", () => {
  it("exits 0 for valid manifest", async () => {
    expect(await runCli(["lint", VALID])).toBe(0);
  });

  it("exits non-zero for reserved identifier", async () => {
    expect(await runCli(["lint", RESERVED])).not.toBe(0);
  });

  it("exits 0 for case-collision (lint does not run post-validation)", async () => {
    expect(await runCli(["lint", CASE_COLLISION])).toBe(0);
  });
});
