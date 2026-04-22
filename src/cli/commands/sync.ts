import { Command } from "commander";
import { resolve, join } from "node:path";
import { stat } from "node:fs/promises";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { computeSyncPlan } from "../../sync/plan.js";
import { runSync } from "../../sync/runner.js";
import { findConcordHome } from "../../discovery/concord-home.js";
import { isInteractive, promptYesNo } from "../util/tty.js";

export function registerSyncCommand(
  program: Command,
  setExitCode: (code: number) => void,
): void {
  program
    .command("sync")
    .description("Apply manifest to provider targets")
    .option(
      "--scope <scope>",
      "scope (project|user|enterprise|local)",
      "project",
    )
    .option("--manifest <path>", "manifest file path")
    .option("--lock <path>", "lock file path")
    .option("--yes", "skip bootstrap confirm")
    .action(
      async (opts: { scope: string; manifest?: string; lock?: string; yes?: boolean }) => {
        const manifestPath = opts.manifest
          ? resolve(opts.manifest)
          : resolve("concord.yaml");
        const lockPath = opts.lock
          ? resolve(opts.lock)
          : resolve("concord.lock");
        const concordHome = findConcordHome();
        const cacheDir = join(concordHome, "cache");

        const manifestRaw = loadYaml(manifestPath);
        const manifest = validateManifest(manifestRaw);

        const lockExists = await stat(lockPath).then(() => true).catch(() => false);
        const currentLock = lockExists
          ? readLock(lockPath)
          : ({ lockfile_version: 1, roots: [], nodes: {} }) as any;

        const plan = computeSyncPlan(manifest as any, currentLock);

        // §6.14 guided bootstrap gate
        const needsBootstrap =
          !lockExists &&
          (plan.summary.install + plan.summary.update + plan.summary.prune) > 0;
        if (needsBootstrap && !opts.yes) {
          if (!isInteractive()) {
            process.stderr.write(
              "error: no concord.lock found — first run requires --yes or an interactive TTY (§6.14)\n",
            );
            setExitCode(1);
            return;
          }
          process.stderr.write("No concord.lock found — first run detected.\n");
          process.stderr.write(
            `  Will perform: install=${plan.summary.install} update=${plan.summary.update}\n`,
          );
          const ok = await promptYesNo("Continue?");
          if (!ok) {
            process.stderr.write("sync: cancelled\n");
            return;
          }
        }

        process.stderr.write(
          `plan: install=${plan.summary.install} update=${plan.summary.update} prune=${plan.summary.prune}\n`,
        );

        const result = await runSync(plan, {
          fetchContext: { concordHome, cacheDir, allowNetwork: true },
          onProgress: (a, s) =>
            process.stderr.write(`[${s}] ${a.kind} ${a.nodeId}\n`),
        });

        process.stderr.write(
          `done: installed=${result.installed.length} updated=${result.updated.length} pruned=${result.pruned.length} errors=${result.errors.length}\n`,
        );

        if (result.errors.length > 0) {
          for (const e of result.errors)
            process.stderr.write(`ERROR ${e.nodeId}: ${e.message}\n`);
          setExitCode(1);
          return; // 오류 시 lock 기록하지 않음 (Option A: process.exit 대신 setExitCode + return)
        }

        await writeLockAtomic(lockPath, currentLock);
      },
    );
}
