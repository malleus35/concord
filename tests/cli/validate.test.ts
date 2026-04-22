import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { runCli } from "../../src/cli/index.js";

const VALID = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");
const RESERVED = path.resolve(__dirname, "../fixtures/manifest-reserved.yaml");
const CASE_COLLISION = path.resolve(
  __dirname,
  "../fixtures/manifest-case-collision.yaml",
);

describe("concord validate", () => {
  it("exits 0 for valid manifest", async () => {
    const code = await runCli(["validate", VALID]);
    expect(code).toBe(0);
  });

  it("exits non-zero for manifest with reserved identifier", async () => {
    const code = await runCli(["validate", RESERVED]);
    expect(code).not.toBe(0);
  });

  it("exits non-zero for case-insensitive collision", async () => {
    const code = await runCli(["validate", CASE_COLLISION]);
    expect(code).not.toBe(0);
  });
});
