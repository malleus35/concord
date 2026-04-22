import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { findConcordHome } from "../../src/discovery/concord-home.js";

// Mock node:os so that `os.homedir()` returns a per-test tmp dir
// without a pre-existing ~/.concord/ — this keeps the test environment-
// independent (dev machines may have a real ~/.concord/).
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => homedirRef.value,
  };
});

const homedirRef: { value: string } = { value: "" };
const savedEnv = { ...process.env };
let tmpHome: string;

beforeEach(() => {
  delete process.env.CONCORD_HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.APPDATA;
  // fake home without pre-existing .concord/
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "concord-test-home-"));
  homedirRef.value = tmpHome;
});

afterEach(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true });
  process.env = { ...savedEnv };
});

describe("findConcordHome", () => {
  it("returns $CONCORD_HOME if set (step 1, highest priority)", () => {
    process.env.CONCORD_HOME = "/tmp/my-concord-override";
    expect(findConcordHome()).toBe("/tmp/my-concord-override");
  });

  it("falls back to default <home>/.concord when no env var and no existing config", () => {
    expect(findConcordHome()).toBe(path.join(tmpHome, ".concord"));
  });

  it("prefers existing $XDG_CONFIG_HOME/concord over ~/.config/concord", () => {
    // tmpHome/.concord is intentionally absent — so step 2 fall-through to step 3
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "concord-xdg-"));
    process.env.XDG_CONFIG_HOME = tmp;
    fs.mkdirSync(path.join(tmp, "concord"), { recursive: true });
    expect(findConcordHome()).toBe(path.join(tmp, "concord"));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
