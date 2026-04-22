import * as readline from "node:readline";

/**
 * §6.14 / §6.4.2 / §6.16:
 * TTY = (stdout.isTTY ∧ stdin.isTTY) ∧ ¬CONCORD_NONINTERACTIVE.
 * CI 에서 CONCORD_NONINTERACTIVE=1 설정 시 flag 없는 prompt 동작은 conservative fail.
 */
export function isInteractive(): boolean {
  if (process.env.CONCORD_NONINTERACTIVE === "1") return false;
  const out = process.stdout.isTTY === true;
  const inp = process.stdin.isTTY === true;
  return out && inp;
}

export interface PromptOptions {
  /** Default when the user presses enter without typing. */
  defaultNo?: boolean;
}

/**
 * Minimal y/N prompt. Caller MUST verify isInteractive() first.
 * - Accepts "y" / "yes" (case-insensitive) → true; everything else → false.
 * - Writes the question to stderr (stdout is reserved for machine output).
 */
export async function promptYesNo(question: string, _opts: PromptOptions = {}): Promise<boolean> {
  if (!isInteractive()) {
    throw new Error("promptYesNo called in non-interactive session");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer: string = await new Promise((resolve) => {
      rl.question(`${question} [y/N] `, (a) => resolve(a));
    });
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
