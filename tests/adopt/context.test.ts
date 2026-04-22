import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineAdoptScopes } from "../../src/adopt/context.js";

describe("adopt context-aware", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-adopt-ctx-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("cwd has concord.yaml → user + project", async () => {
    await writeFile(join(tmp, "concord.yaml"), "skills: []\n");
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: null });
    expect(scopes).toEqual(["user", "project"]);
  });

  it("cwd lacks concord.yaml → user only", async () => {
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: null });
    expect(scopes).toEqual(["user"]);
  });

  it("explicit scope overrides", async () => {
    await writeFile(join(tmp, "concord.yaml"), "skills: []\n");
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: "project" });
    expect(scopes).toEqual(["project"]);
  });

  it("enterprise can only be explicit (never defaulted)", async () => {
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: "enterprise" });
    expect(scopes).toEqual(["enterprise"]);
  });
});
