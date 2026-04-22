import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { listCommand } from "../../src/cli/commands/list.js";

const LOCK = path.resolve(__dirname, "../fixtures/lock-valid.json");

describe("concord list --dry-run", () => {
  it("returns exit 0 + produces output listing nodes", async () => {
    const lines: string[] = [];
    const code = await listCommand(LOCK, (msg) => lines.push(msg));
    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("claude-code:skills:commit-msg");
  });

  it("exits non-zero for missing lock", async () => {
    const code = await listCommand("/nonexistent/lock.json", () => {});
    expect(code).not.toBe(0);
  });
});
