export type SyncAction =
  | { kind: "install"; nodeId: string; manifestEntry: any }
  | { kind: "update"; nodeId: string; manifestEntry: any; existingNode: any }
  | { kind: "prune"; nodeId: string; existingNode: any }
  | { kind: "skip"; nodeId: string; reason: string };

export interface SyncPlan {
  actions: SyncAction[];
  summary: { install: number; update: number; prune: number; skip: number };
}

const ASSET_TYPES = ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"] as const;

export function computeSyncPlan(manifest: any, lock: any): SyncPlan {
  const actions: SyncAction[] = [];
  const manifestIds = new Set<string>();
  for (const at of ASSET_TYPES) {
    for (const entry of manifest?.[at] ?? []) {
      const nodeId = entry.id as string;
      manifestIds.add(nodeId);
      const existing = lock?.nodes?.[nodeId];
      if (!existing) actions.push({ kind: "install", nodeId, manifestEntry: entry });
      else actions.push({ kind: "update", nodeId, manifestEntry: entry, existingNode: existing });
    }
  }
  for (const [nodeId, node] of Object.entries(lock?.nodes ?? {})) {
    if (!manifestIds.has(nodeId)) actions.push({ kind: "prune", nodeId, existingNode: node });
  }
  const summary = { install: 0, update: 0, prune: 0, skip: 0 };
  for (const a of actions) summary[a.kind]++;
  return { actions, summary };
}
