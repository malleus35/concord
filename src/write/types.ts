import type { ManagedBlock } from "../round-trip/types.js";

export type WriteOp =
  | { op: "upsertBlock"; id: string; content: string; hashSuffix: string }
  | { op: "removeBlock"; id: string }
  | { op: "upsertOwnedKey"; path: readonly (string | number)[]; value: unknown; hash: string }
  | { op: "removeOwnedKey"; path: readonly (string | number)[] };

export interface WriteRequest { source: string; ops: readonly WriteOp[]; }

export interface WriteResult {
  modified: string;
  opsApplied: number;
  blocks: ManagedBlock[];
  originalBytes: number;
  modifiedBytes: number;
}

export interface ConfigWriter {
  supports(path: string, source: string): boolean;
  write(req: WriteRequest): Promise<WriteResult>;
}
