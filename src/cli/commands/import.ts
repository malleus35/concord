import { Command } from "commander";
import { readFile } from "node:fs/promises";
import writeFileAtomic from "write-file-atomic";
import { join } from "node:path";
import YAML from "yaml";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { mergeExternal, type MergePolicy } from "../../manifest-edit/merge-external.js";
import { createHttpFetcher } from "../../fetch/http.js";
import type { FetchSource } from "../../fetch/types.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import { ConfigScope } from "../../schema/types.js";

/** CLI surface policy values — `keep-mine` is programmatic-only (§6.5). */
const CLI_POLICIES = ["skip", "replace", "alias"] as const;
type CliPolicy = (typeof CLI_POLICIES)[number];
function isCliPolicy(v: string): v is CliPolicy {
  return (CLI_POLICIES as readonly string[]).includes(v);
}

/** §6.5 concord import — merge external manifest into target scope (file or --url). */
export function registerImportCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("import [file]")
    .description("Merge entries from an external manifest (file or --url)")
    .option("--url <url>", "fetch from https URL")
    .option("--sha256 <hash>", "required sha256 digest when --url")
    .option("--target-scope <scope>", "manifest to modify", "user")
    .option("--policy <p>", "skip|replace|alias", "skip")
    .option("--yes", "skip confirmation")
    .option("--dry-run", "preview only")
    .action(async (
      file: string | undefined,
      opts: {
        url?: string;
        sha256?: string;
        targetScope: string;
        policy: string;
        yes?: boolean;
        dryRun?: boolean;
      },
    ) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();

      // Validate --target-scope
      const parsedScope = ConfigScope.safeParse(opts.targetScope);
      if (!parsedScope.success) {
        process.stderr.write(`error: invalid --target-scope '${opts.targetScope}'\n`);
        setExitCode(1); return;
      }
      const scope = parsedScope.data;
      const target = manifestPathForScope(scope, { concordHome, cwd });

      // Validate --policy (skip/replace/alias only — keep-mine is programmatic-only)
      if (!isCliPolicy(opts.policy)) {
        process.stderr.write(`error: invalid --policy '${opts.policy}' (expected skip|replace|alias)\n`);
        setExitCode(1); return;
      }
      const policy: MergePolicy = opts.policy;

      // Load external manifest bytes
      let externalRaw: string;
      if (opts.url) {
        if (!opts.sha256) {
          process.stderr.write("error: --url requires --sha256 <hash> (§6.15.1)\n");
          setExitCode(1); return;
        }
        const fetcher = createHttpFetcher();
        const src: FetchSource = { type: "http", url: opts.url, sha256: opts.sha256 };
        try {
          const r = await fetcher.fetch(src, {
            concordHome,
            cacheDir: join(concordHome, "cache"),
            allowNetwork: true,
          });
          externalRaw = await readFile(r.localPath, "utf8");
        } catch (err) {
          process.stderr.write(`error: ${(err as Error).message}\n`);
          setExitCode(1); return;
        }
      } else if (file) {
        try {
          externalRaw = await readFile(file, "utf8");
        } catch (err) {
          process.stderr.write(`error: cannot read ${file}: ${(err as Error).message}\n`);
          setExitCode(1); return;
        }
      } else {
        process.stderr.write("error: provide <file> or --url\n");
        setExitCode(1); return;
      }

      // Validate external manifest parses to an object
      const ext = YAML.parse(externalRaw);
      if (!ext || typeof ext !== "object") {
        process.stderr.write("error: external manifest did not parse to an object\n");
        setExitCode(1); return;
      }

      // Load target manifest
      let own: string;
      try {
        own = await readFile(target, "utf8");
      } catch {
        process.stderr.write(
          `error: target manifest missing at ${target}. Run 'concord init --scope ${scope}' first.\n`,
        );
        setExitCode(1); return;
      }

      // Merge
      const { merged, conflicts } = mergeExternal(own, ext as Record<string, unknown>, policy);

      process.stderr.write(`Merging into ${scope} manifest (policy: ${policy})\n`);
      for (const c of conflicts) {
        process.stderr.write(`  conflict ${c.assetType}:${c.id} → ${c.action}\n`);
      }

      // Dry-run: preview only, no write
      if (opts.dryRun) return;

      // Terraform apply pattern
      const apply = opts.yes === true;
      const interactive = !apply && isInteractive();
      if (!apply && !interactive) {
        process.stderr.write("error: non-interactive; pass --yes or --dry-run\n");
        setExitCode(1); return;
      }
      if (!apply) {
        const ok = await promptYesNo("Apply these changes?");
        if (!ok) { process.stderr.write("import: cancelled\n"); return; }
      }

      await writeFileAtomic(target, merged, "utf8");
      process.stdout.write(`updated: ${target}\n`);
    });
}
