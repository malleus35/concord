import { Command } from "commander";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { ConfigScope } from "../../schema/types.js";

const SCAFFOLD = [
  'concord_version: ">=0.1"',
  "skills: []",
  "subagents: []",
  "hooks: []",
  "mcp_servers: []",
  "instructions: []",
  "plugins: []",
  "",
].join("\n");

/** §6.2 concord init — scope별 manifest scaffold (no --force in Phase 1). */
export function registerInitCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("init")
    .description("Create a new concord manifest for the given scope")
    .option("--scope <scope>", "enterprise|user|project|local", "project")
    .action(async (opts: { scope: string }) => {
      const parsed = ConfigScope.safeParse(opts.scope);
      if (!parsed.success) {
        process.stderr.write(`error: invalid --scope '${opts.scope}'\n`);
        setExitCode(1);
        return;
      }
      const scope = parsed.data;

      const ctx = { concordHome: findConcordHome(), cwd: process.cwd() };
      const target = manifestPathForScope(scope, ctx);

      await mkdir(dirname(target), { recursive: true });
      try {
        // 'wx' flag: atomic create — fails if file exists (closes TOCTOU window vs stat-then-write).
        await writeFile(target, SCAFFOLD, { encoding: "utf8", flag: "wx" });
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "EEXIST") {
          process.stderr.write(`error: ${target} already exists\n`);
          setExitCode(1);
          return;
        }
        throw err;
      }
      process.stdout.write(`created: ${target}\n`);
    });
}
