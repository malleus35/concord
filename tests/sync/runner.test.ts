import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync, type RunSyncOptions } from "../../src/sync/runner.js";
import { computeSyncPlan } from "../../src/sync/plan.js";

describe("runSync", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "concord-runner-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("end-to-end install: source file copied to target path, result.installed includes nodeId", async () => {
    // Arrange: create a source file
    const srcFile = join(tmpDir, "source.txt");
    await writeFile(srcFile, "hello concord");

    const targetPath = join(tmpDir, "target", "source.txt");

    const manifest = {
      skills: [
        {
          id: "skills:foo",
          source: { type: "file", path: srcFile },
          target_path: targetPath,
          asset_type: "skills",
          provider: "claude-code",
          install: "copy",
        },
      ],
    };
    const lock = { nodes: {} };
    const plan = computeSyncPlan(manifest, lock);

    const fetchContext = {
      concordHome: join(tmpDir, "concord-home"),
      cacheDir: join(tmpDir, "cache"),
    };

    const opts: RunSyncOptions = { fetchContext };

    // Act
    const result = await runSync(plan, opts);

    // Assert
    expect(result.installed).toContain("skills:foo");
    expect(result.errors).toHaveLength(0);
    // Target file should be accessible
    await expect(access(targetPath)).resolves.toBeUndefined();
  });

  it("error collected: non-existent source path → result.errors has entry, result.installed is empty", async () => {
    const missingPath = join(tmpDir, "does-not-exist.txt");
    const targetPath = join(tmpDir, "target", "out.txt");

    const manifest = {
      skills: [
        {
          id: "skills:missing",
          source: { type: "file", path: missingPath },
          target_path: targetPath,
          install: "copy",
        },
      ],
    };
    const lock = { nodes: {} };
    const plan = computeSyncPlan(manifest, lock);

    const fetchContext = {
      concordHome: join(tmpDir, "concord-home"),
      cacheDir: join(tmpDir, "cache"),
    };

    const opts: RunSyncOptions = { fetchContext };

    // Act
    const result = await runSync(plan, opts);

    // Assert
    expect(result.installed).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].nodeId).toBe("skills:missing");
    expect(result.errors[0].message).toBeTruthy();
  });

  it("prune action: result.pruned contains nodeId (no actual deletion)", async () => {
    // Lock has a node not in manifest → prune action generated
    const manifest = {};
    const lock = {
      nodes: {
        "skills:old": { id: "skills:old", installed_at: "2026-01-01" },
      },
    };
    const plan = computeSyncPlan(manifest, lock);

    const fetchContext = {
      concordHome: join(tmpDir, "concord-home"),
      cacheDir: join(tmpDir, "cache"),
    };

    const opts: RunSyncOptions = { fetchContext };

    // Act
    const result = await runSync(plan, opts);

    // Assert
    expect(result.pruned).toContain("skills:old");
    expect(result.errors).toHaveLength(0);
  });

  it("onProgress callback: called with start + done for each action", async () => {
    const srcFile = join(tmpDir, "progress-src.txt");
    await writeFile(srcFile, "progress test");

    const targetPath = join(tmpDir, "progress-target", "out.txt");

    const manifest = {
      skills: [
        {
          id: "skills:progress",
          source: { type: "file", path: srcFile },
          target_path: targetPath,
          asset_type: "skills",
          provider: "claude-code",
          install: "copy",
        },
      ],
    };
    const lock = { nodes: {} };
    const plan = computeSyncPlan(manifest, lock);

    const fetchContext = {
      concordHome: join(tmpDir, "concord-home"),
      cacheDir: join(tmpDir, "cache"),
    };

    const events: Array<{ kind: string; status: string }> = [];
    const opts: RunSyncOptions = {
      fetchContext,
      onProgress: (action, status) => {
        events.push({ kind: action.kind, status });
      },
    };

    await runSync(plan, opts);

    expect(events).toContainEqual({ kind: "install", status: "start" });
    expect(events).toContainEqual({ kind: "install", status: "done" });
  });

  it("resolves {env:X} in entry.source.path before fetching (E-2 on-install eager)", async () => {
    // Create a source file; point manifest at its dir via {env:SRC_FILE}
    const srcFile = join(tmpDir, "eager-src.txt");
    await writeFile(srcFile, "hi", "utf8");

    const manifest = {
      skills: [{
        id: "skills:e",
        provider: "claude-code",
        asset_type: "skills",
        source: { type: "file", path: "{env:SRC_FILE}" },
        target_path: join(tmpDir, "out", "eager-src.txt"),
        install: "copy",
      }],
    };
    const lock = { nodes: {} };
    const plan = computeSyncPlan(manifest, lock);
    const result = await runSync(plan, {
      fetchContext: { concordHome: join(tmpDir, "home"), cacheDir: join(tmpDir, "cache") },
      projectRoot: tmpDir,
      env: { SRC_FILE: srcFile },
    });
    expect(result.installed).toContain("skills:e");
    expect(result.errors).toEqual([]);
  });

  it("prune actually removes target file (previously install-only)", async () => {
    const tgt = join(tmpDir, "orphan");
    await writeFile(tgt, "orphan content");
    const lock = {
      nodes: {
        "skills:orphan": {
          target_path: tgt,
          source_digest: "x",
          target_digest: "y",
        },
      },
    };
    const manifest = {}; // empty → prune orphan
    const plan = computeSyncPlan(manifest, lock);
    const result = await runSync(plan, {
      fetchContext: { concordHome: join(tmpDir, "home"), cacheDir: join(tmpDir, "cache") },
      projectRoot: tmpDir,
      env: {},
    });
    expect(result.pruned).toContain("skills:orphan");
    await expect(access(tgt)).rejects.toThrow();
  });

  it("propagates missing env var error (E-4 fail-closed)", async () => {
    const manifest = {
      skills: [{
        id: "skills:m",
        provider: "claude-code",
        asset_type: "skills",
        source: { type: "file", path: "{env:NO_SUCH_VAR_12345}" },
        target_path: join(tmpDir, "out"),
        install: "copy",
      }],
    };
    const lock = { nodes: {} };
    const plan = computeSyncPlan(manifest, lock);
    const result = await runSync(plan, {
      fetchContext: { concordHome: join(tmpDir, "home"), cacheDir: join(tmpDir, "cache") },
      projectRoot: tmpDir,
      env: {}, // NO_SUCH_VAR_12345 missing
    });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.message).toMatch(/env-var-missing/);
  });
});
