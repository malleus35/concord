import { rm } from "node:fs/promises";

export interface RollbackEntry { nodeId: string; targetPath: string; wasPreExisting: boolean; }

export interface RollbackLog {
  entries: RollbackEntry[];
  record(e: RollbackEntry): void;
  rollback(): Promise<{ rolled: string[]; failed: Array<{ nodeId: string; error: string }> }>;
}

export function createRollbackLog(): RollbackLog {
  const entries: RollbackEntry[] = [];
  return {
    entries,
    record(e) { entries.push(e); },
    async rollback() {
      const rolled: string[] = [];
      const failed: Array<{ nodeId: string; error: string }> = [];
      for (const e of [...entries].reverse()) {
        if (e.wasPreExisting) continue;
        try { await rm(e.targetPath, { recursive: true, force: true }); rolled.push(e.nodeId); }
        catch (err) { failed.push({ nodeId: e.nodeId, error: err instanceof Error ? err.message : String(err) }); }
      }
      return { rolled, failed };
    },
  };
}
