import { Command } from "commander";
import { readFile, stat } from "node:fs/promises";
import writeFileAtomic from "write-file-atomic";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { determineAdoptScopes } from "../../adopt/context.js";
import { scanScopeForCandidates, type AdoptCandidate } from "../../adopt/scanner.js";
import { insertEntry } from "../../manifest-edit/insert-entry.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import { ConfigScope } from "../../schema/types.js";

async function manifestExists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

function candidateToEntry(c: AdoptCandidate) {
  return { id: c.id, source: { type: "file" as const, path: c.path } };
}

/**
 * §6.4 concord adopt — scan installed assets, register via Terraform apply pattern.
 * Writes are per-scope; if scope B fails after scope A succeeds, A's write is NOT rolled back.
 */
export function registerAdoptCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("adopt")
    .description("Scan installed assets and register them in your manifest (Terraform apply pattern)")
    .option("--scope <scope>", "enterprise|user|project|local")
    .option("--yes", "skip confirmation")
    .option("--write", "alias for --yes")
    .option("--dry-run", "preview candidates only")
    .action(async (opts: { scope?: string; yes?: boolean; write?: boolean; dryRun?: boolean }) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();

      let explicit: ConfigScope | null = null;
      if (opts.scope !== undefined) {
        const parsed = ConfigScope.safeParse(opts.scope);
        if (!parsed.success) {
          process.stderr.write(`error: invalid --scope '${opts.scope}'\n`);
          setExitCode(1); return;
        }
        explicit = parsed.data;
      }
      const scopes = await determineAdoptScopes({ cwd, explicitScope: explicit });

      // Validate all manifests exist before scanning (fail-fast)
      for (const s of scopes) {
        const target = manifestPathForScope(s, { concordHome, cwd });
        if (!(await manifestExists(target))) {
          process.stderr.write(
            `error: manifest missing for scope '${s}' at ${target}. Run \`concord init --scope ${s}\` first.\n`,
          );
          setExitCode(1); return;
        }
      }

      const all: AdoptCandidate[] = [];
      for (const s of scopes) {
        const found = await scanScopeForCandidates(s, { concordHome, cwd });
        all.push(...found);
      }

      if (all.length === 0) {
        process.stdout.write("adopt: no candidates found\n");
        return;
      }

      process.stderr.write(`Found ${all.length} candidate(s):\n`);
      for (const c of all) {
        process.stderr.write(`  + ${c.scope.padEnd(10)} ${c.id}  @ ${c.path}\n`);
      }

      if (opts.dryRun) return;

      const apply = opts.yes === true || opts.write === true;
      const interactive = !apply && isInteractive();
      if (!apply && !interactive) {
        process.stderr.write("error: non-interactive session; pass --yes or --dry-run\n");
        setExitCode(1); return;
      }
      if (!apply) {
        const ok = await promptYesNo("Apply these changes to manifests?");
        if (!ok) { process.stderr.write("adopt: cancelled\n"); return; }
      }

      for (const s of scopes) {
        const target = manifestPathForScope(s, { concordHome, cwd });
        let src = await readFile(target, "utf8");
        for (const c of all.filter((x) => x.scope === s)) {
          try {
            src = insertEntry(src, c.assetType, candidateToEntry(c));
          } catch (err) {
            const msg = (err as Error).message;
            // Narrow catch to duplicate-id (the only contract error insertEntry throws).
            // Any other error is a bug — propagate so it surfaces in CI.
            if (!msg.startsWith("duplicate id")) throw err;
            process.stderr.write(`warning: ${msg} — skipping ${c.id}\n`);
          }
        }
        await writeFileAtomic(target, src, "utf8");
        process.stdout.write(`updated: ${target}\n`);
      }
    });
}
