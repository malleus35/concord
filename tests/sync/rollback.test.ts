import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRollbackLog, type RollbackEntry } from "../../src/sync/rollback.js";

describe("createRollbackLog", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "concord-rollback-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("rolls back in reverse order (last recorded first removed)", async () => {
    const log = createRollbackLog();
    const order: string[] = [];

    // record 3 entries — we verify rolled[] is in reverse
    const entries: RollbackEntry[] = [
      { nodeId: "node-A", targetPath: join(tmpDir, "a.txt"), wasPreExisting: false },
      { nodeId: "node-B", targetPath: join(tmpDir, "b.txt"), wasPreExisting: false },
      { nodeId: "node-C", targetPath: join(tmpDir, "c.txt"), wasPreExisting: false },
    ];

    // create the target files
    for (const e of entries) {
      await writeFile(e.targetPath, "content");
    }

    for (const e of entries) {
      log.record(e);
    }

    const { rolled, failed } = await log.rollback();

    expect(failed).toHaveLength(0);
    expect(rolled).toEqual(["node-C", "node-B", "node-A"]);
  });

  it("skips pre-existing entries and leaves their targets intact", async () => {
    const log = createRollbackLog();

    const preExistingPath = join(tmpDir, "pre-existing.txt");
    await writeFile(preExistingPath, "important");

    const entry: RollbackEntry = {
      nodeId: "node-pre",
      targetPath: preExistingPath,
      wasPreExisting: true,
    };
    log.record(entry);

    const { rolled, failed } = await log.rollback();

    expect(rolled).not.toContain("node-pre");
    expect(failed).toHaveLength(0);

    // file must still exist
    const s = await stat(preExistingPath);
    expect(s.isFile()).toBe(true);
  });

  it("removes a non-pre-existing file", async () => {
    const log = createRollbackLog();

    const filePath = join(tmpDir, "fresh.txt");
    await writeFile(filePath, "new content");

    const entry: RollbackEntry = {
      nodeId: "node-fresh",
      targetPath: filePath,
      wasPreExisting: false,
    };
    log.record(entry);

    const { rolled, failed } = await log.rollback();

    expect(rolled).toContain("node-fresh");
    expect(failed).toHaveLength(0);

    // file must be gone
    await expect(stat(filePath)).rejects.toThrow();
  });

  it("does not fail when removing a non-existent path (force:true semantics)", async () => {
    const log = createRollbackLog();

    const missingPath = join(tmpDir, "does-not-exist.txt");

    const entry: RollbackEntry = {
      nodeId: "node-missing",
      targetPath: missingPath,
      wasPreExisting: false,
    };
    log.record(entry);

    const { rolled, failed } = await log.rollback();

    // force:true means missing path is not an error
    expect(failed).toHaveLength(0);
    expect(rolled).toContain("node-missing");
  });
});
