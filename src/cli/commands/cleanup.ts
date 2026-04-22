import { Command } from "commander";
import { resolve } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { uninstall } from "../../install/uninstall.js";

interface LockShape {
  lockfile_version?: unknown;
  roots?: unknown;
  nodes?: Record<string, { target_path?: unknown }>;
}

export function registerCleanupCommand(
  program: Command,
  setExitCode: (code: number) => void,
): void {
  program
    .command("cleanup")
    .description("Remove targets that exist in lock but are no longer in manifest (extraneous prune)")
    .option("--manifest <path>", "manifest file path", "concord.yaml")
    .option("--lock <path>", "lock file path", "concord.lock")
    .option("--yes", "skip confirmation prompt")
    .option("--dry-run", "report only; do not remove anything")
    .action(async (opts: { manifest: string; lock: string; yes?: boolean; dryRun?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      const lockPath = resolve(opts.lock);

      let manifestRaw: unknown;
      try {
        manifestRaw = loadYaml(manifestPath);
        validateManifest(manifestRaw);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`error: ${msg}\n`);
        setExitCode(1);
        return;
      }

      let currentLock: LockShape;
      try {
        currentLock = readLock(lockPath) as LockShape;
      } catch {
        currentLock = { lockfile_version: 1, roots: [], nodes: {} };
      }

      const manifestIds = new Set<string>();
      for (const key of ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]) {
        const arr = (manifestRaw as Record<string, unknown>)[key];
        if (Array.isArray(arr)) {
          for (const e of arr) {
            if (e && typeof e === "object") {
              const id = (e as Record<string, unknown>).id;
              if (typeof id === "string") manifestIds.add(id);
            }
          }
        }
      }

      const extraneous: Array<{ id: string; target: string }> = [];
      const nodes = currentLock.nodes ?? {};
      for (const [id, node] of Object.entries(nodes)) {
        if (!manifestIds.has(id)) {
          const tp = (node as { target_path?: unknown }).target_path;
          if (typeof tp === "string") {
            extraneous.push({ id, target: tp });
          }
        }
      }

      if (extraneous.length === 0) {
        process.stdout.write("cleanup: nothing to remove\n");
        return;
      }

      if (opts.dryRun) {
        process.stdout.write(`cleanup (dry-run): would remove ${extraneous.length} entries:\n`);
        for (const e of extraneous) process.stdout.write(`  ${e.id} → ${e.target}\n`);
        return;
      }

      if (!opts.yes) {
        process.stdout.write(`cleanup: ${extraneous.length} extraneous entries. Re-run with --yes to remove.\n`);
        for (const e of extraneous) process.stdout.write(`  ${e.id} → ${e.target}\n`);
        setExitCode(1);
        return;
      }

      let removed = 0;
      const newNodes: Record<string, unknown> = { ...nodes };
      for (const e of extraneous) {
        try {
          await uninstall(e.target);
          delete newNodes[e.id];
          removed++;
        } catch (err) {
          process.stderr.write(`cleanup: failed to remove ${e.id}: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
      const updatedLock = { ...currentLock, nodes: newNodes };
      await writeLockAtomic(lockPath, updatedLock);
      process.stdout.write(`cleanup: removed ${removed} entries\n`);
    });
}
