import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { replaceWhole } from "../../manifest-edit/replace-whole.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { createHttpFetcher } from "../../fetch/http.js";
import type { FetchSource } from "../../fetch/types.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import { ConfigScope } from "../../schema/types.js";

/** §6.6 concord replace — swap an entire manifest (auto-backup). */
export function registerReplaceCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("replace [file]")
    .description("Replace an entire manifest with an external copy (auto-backup)")
    .option("--url <url>")
    .option("--sha256 <hash>")
    .option("--target-scope <scope>", "", "user")
    .option("--yes")
    .option("--dry-run")
    .action(async (file: string | undefined, opts: { url?: string; sha256?: string; targetScope: string; yes?: boolean; dryRun?: boolean }) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();

      const parsedScope = ConfigScope.safeParse(opts.targetScope);
      if (!parsedScope.success) {
        process.stderr.write(`error: invalid --target-scope '${opts.targetScope}'\n`);
        setExitCode(1); return;
      }
      const scope = parsedScope.data;
      const target = manifestPathForScope(scope, { concordHome, cwd });

      // Load new manifest bytes
      let newRaw: string;
      if (opts.url) {
        if (!opts.sha256) {
          process.stderr.write("error: --url requires --sha256 (§6.15.1)\n");
          setExitCode(1); return;
        }
        const fetcher = createHttpFetcher();
        const src: FetchSource = { type: "http", url: opts.url, sha256: opts.sha256 };
        try {
          const r = await fetcher.fetch(src, {
            concordHome, cacheDir: join(concordHome, "cache"), allowNetwork: true,
          });
          newRaw = await readFile(r.localPath, "utf8");
        } catch (err) {
          process.stderr.write(`error: ${(err as Error).message}\n`);
          setExitCode(1); return;
        }
      } else if (file) {
        try { newRaw = await readFile(file, "utf8"); }
        catch (err) { process.stderr.write(`error: cannot read ${file}: ${(err as Error).message}\n`); setExitCode(1); return; }
      } else {
        process.stderr.write("error: provide <file> or --url\n");
        setExitCode(1); return;
      }

      // Validate BEFORE overwrite (fail-closed)
      try { validateManifest(YAML.parse(newRaw)); }
      catch (err) {
        process.stderr.write(`error: invalid manifest: ${(err as Error).message}\n`);
        setExitCode(1); return;
      }

      process.stderr.write(`Will replace ${target} entirely.\n`);

      if (opts.dryRun) return;

      const apply = opts.yes === true;
      if (!apply) {
        if (!isInteractive()) {
          process.stderr.write("error: non-interactive; pass --yes or --dry-run\n");
          setExitCode(1); return;
        }
        const ok = await promptYesNo("Continue?");
        if (!ok) { process.stderr.write("replace: cancelled\n"); return; }
      }
      try {
        const r = await replaceWhole(target, newRaw);
        process.stdout.write(`updated: ${target}\nbackup: ${r.backupPath}\n`);
      } catch (err) {
        process.stderr.write(`error: ${(err as Error).message}\n`);
        setExitCode(1);
      }
    });
}
