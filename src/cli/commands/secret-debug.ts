import { Command } from "commander";
import { findConcordHome } from "../../discovery/concord-home.js";
import { appendAudit } from "../../audit/log.js";
import { isInteractive } from "../util/tty.js";

function mask(v: string): string {
  if (v.length === 0) return "(empty)";
  if (v.length <= 4) return "***";
  return `${v.slice(0, 4)}***`;
}

/** §6.13 E-8 concord secret debug — interactive resolved-value view (audit-logged). */
export function registerSecretDebugCommand(program: Command, setExitCode: (c: number) => void): void {
  const secret = program.command("secret").description("Secret-related diagnostics");
  secret
    .command("debug")
    .description("Show the resolved value for {env:NAME} (TTY-only, audit-logged)")
    .requiredOption("--env <name>", "environment variable name")
    .option("--json", "forbidden — interactive TTY only")
    .option("-v, --verbose", "show full value (default: masked)")
    .action(async (opts: { env: string; json?: boolean; verbose?: boolean }) => {
      if (opts.json) {
        process.stderr.write("error: --json is not supported for secret debug (interactive only)\n");
        setExitCode(1); return;
      }
      if (!isInteractive()) {
        process.stderr.write("error: `concord secret debug` requires an interactive TTY (E-8)\n");
        setExitCode(1); return;
      }
      const raw = process.env[opts.env];
      const concordHome = findConcordHome();
      try {
        await appendAudit(concordHome, {
          action: "secret-debug",
          env: opts.env,
          command: `secret debug --env ${opts.env}`,
        });
      } catch {
        /* Audit write failures must NOT leak a resolved value via stderr; silently ignore. */
      }
      if (raw === undefined) { process.stdout.write(`${opts.env}: (unset)\n`); return; }
      const display = opts.verbose ? raw : mask(raw);
      process.stdout.write(`${opts.env}: ${display}\n`);
    });
}
