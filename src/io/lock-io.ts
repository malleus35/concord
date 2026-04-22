import * as fs from "node:fs";

/** §5 Lock file reader. Plan 1 은 read-only; write 는 Plan 2 에서. */
export function readLock(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Lock file '${filePath}' did not parse to an object`);
  }
  return parsed as Record<string, unknown>;
}
