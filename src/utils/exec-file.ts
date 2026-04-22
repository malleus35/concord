import * as cp from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(cp.execFile);

export interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
  errorCode?: string;
}

export async function runCommand(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, options);
    return {
      stdout: Buffer.isBuffer(stdout) ? stdout.toString("utf8") : String(stdout),
      stderr: Buffer.isBuffer(stderr) ? stderr.toString("utf8") : String(stderr),
      status: 0,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? (err.message ?? ""),
      status: typeof err.code === "number" ? err.code : null,
      errorCode: typeof err.code === "string" ? err.code : undefined,
    };
  }
}
