import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";

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

  await program.parseAsync(argv, { from: "user" });
  return exitCode;
}

/** Direct CLI invocation (from bin): surface the exit code to the OS. */
export async function run(argv: string[]): Promise<void> {
  const code = await runCli(argv);
  process.exit(code);
}
