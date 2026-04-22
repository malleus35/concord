import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { readLock } from "../../src/io/lock-io.js";

const FIXTURE = path.resolve(__dirname, "../fixtures/lock-valid.json");

describe("readLock", () => {
  it("parses JSON lock file", () => {
    const lock = readLock(FIXTURE) as {
      lockfile_version: number;
      roots: string[];
      nodes: Record<string, unknown>;
    };
    expect(lock.lockfile_version).toBe(1);
    expect(lock.roots).toEqual(["claude-code:skills:commit-msg"]);
    expect(Object.keys(lock.nodes)).toHaveLength(1);
  });

  it("throws on non-existent file", () => {
    expect(() => readLock("/nonexistent/lock.json")).toThrow();
  });
});
