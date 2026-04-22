import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { registerSyncCommand } from "./commands/sync.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerCleanupCommand } from "./commands/cleanup.js";
import { registerInitCommand } from "./commands/init.js";
import { registerDetectCommand } from "./commands/detect.js";
import { registerAdoptCommand } from "./commands/adopt.js";
import { registerImportCommand } from "./commands/import.js";
import { registerReplaceCommand } from "./commands/replace.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerWhyCommand } from "./commands/why.js";
import { registerSecretDebugCommand } from "./commands/secret-debug.js";

/**
 * Programmatic CLI entry (testable). Parses `argv` as user-supplied arguments
 * (no node/script prefix) and returns the resulting exit code without calling
 * `process.exit`.
 *
 * Task 25/26 에서 `lint` / `list` 명령을 추가한다.
 */
export async function runCli(argv: string[]): Promise<number> {
  const program = new Command();
  program.name("concord").version("0.1.0");

  let exitCode = 0;

  program
    .command("validate <manifest>")
    .description(
      "Validate a manifest against schema + Reserved Registry + allowlist",
    )
    .action(async (manifest: string) => {
      exitCode = await validateCommand(manifest);
    });

  program
    .command("lint <manifest>")
    .description(
      "Lint manifest (Reserved Registry + interpolation allowlist only)",
    )
    .action(async (manifest: string) => {
      const { lintCommand } = await import("./commands/lint.js");
      exitCode = await lintCommand(manifest);
    });

  program
    .command("list")
    .description(
      "List installed entries from concord.lock (dry-run only, Plan 1)",
    )
    .option("--lock <path>", "Path to lock file", "concord.lock")
    .option("--dry-run", "Read-only listing (default in Plan 1)", true)
    .action(async (opts: { lock: string }) => {
      const { listCommand } = await import("./commands/list.js");
      exitCode = await listCommand(opts.lock);
    });

  registerSyncCommand(program, (code) => {
    exitCode = code;
  });

  registerDoctorCommand(program, (code) => {
    exitCode = code;
  });

  registerCleanupCommand(program, (code) => {
    exitCode = code;
  });

  registerInitCommand(program, (code) => {
    exitCode = code;
  });

  registerDetectCommand(program, (code) => {
    exitCode = code;
  });

  registerAdoptCommand(program, (code) => {
    exitCode = code;
  });

  registerImportCommand(program, (code) => {
    exitCode = code;
  });

  registerReplaceCommand(program, (code) => {
    exitCode = code;
  });

  registerUpdateCommand(program, (code) => {
    exitCode = code;
  });

  registerWhyCommand(program, (code) => {
    exitCode = code;
  });

  registerSecretDebugCommand(program, (code) => {
    exitCode = code;
  });

  await program.parseAsync(argv, { from: "user" });
  return exitCode;
}

/** Direct CLI invocation (from bin): surface the exit code to the OS. */
export async function run(argv: string[]): Promise<void> {
  const code = await runCli(argv);
  process.exit(code);
}
