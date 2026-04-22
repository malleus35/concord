import { resolveFetcher, createFetcherRegistry } from "../fetch/registry.js";
import { createSymlinkInstaller } from "../install/symlink.js";
import { createCopyInstaller } from "../install/copy.js";
import { effectiveMode } from "../install/routing.js";
import { resolveEntry } from "../secret/resolve-entry.js";
import type { SyncAction, SyncPlan } from "./plan.js";
import type { FetchContext } from "../fetch/types.js";

export interface RunSyncOptions {
  fetchContext: FetchContext;
  /** Project root for {file:X} traversal check (E-10). Default: process.cwd(). */
  projectRoot?: string;
  /** Env snapshot. Default: process.env. */
  env?: Readonly<Record<string, string | undefined>>;
  onProgress?: (a: SyncAction, s: "start" | "done" | "skip" | "error", err?: Error) => void;
}

export interface RunSyncResult {
  installed: string[]; updated: string[]; pruned: string[]; skipped: string[];
  errors: Array<{ nodeId: string; message: string }>;
}

export async function runSync(plan: SyncPlan, opts: RunSyncOptions): Promise<RunSyncResult> {
  const fetchers = createFetcherRegistry();
  const symlink = createSymlinkInstaller();
  const copy = createCopyInstaller();
  const result: RunSyncResult = { installed: [], updated: [], pruned: [], skipped: [], errors: [] };
  for (const action of plan.actions) {
    opts.onProgress?.(action, "start");
    try {
      if (action.kind === "install" || action.kind === "update") {
        const rawEntry = action.manifestEntry as Record<string, unknown>;
        // E-2 on-install eager: resolve allowed fields with current env
        const provider = (rawEntry.provider as string | undefined) ?? "claude-code";
        const assetType = (rawEntry.asset_type as string | undefined) ?? deriveAssetType(rawEntry);
        const resolverCtx = {
          projectRoot: opts.projectRoot ?? process.cwd(),
          env: opts.env ?? (process.env as unknown as Readonly<Record<string, string | undefined>>),
          provider: provider as "claude-code" | "codex" | "opencode",
          assetType: assetType as "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins",
          fieldPath: `entry[${action.nodeId}]`,
        };
        const resolved = resolveEntry(rawEntry, resolverCtx);
        const entry = resolved.entry as any;
        const fetcher = resolveFetcher(entry.source, fetchers);
        const fetched = await fetcher.fetch(entry.source, opts.fetchContext);
        const context = {
          assetType: entry.asset_type ?? deriveAssetType(entry),
          provider: entry.provider ?? "claude-code",
          platform: process.platform as NodeJS.Platform,
        };
        const requestedMode = (entry.install ?? "auto") as any;
        const req = { sourcePath: fetched.localPath, targetPath: entry.target_path, kind: fetched.kind, requestedMode, context };
        const mode = effectiveMode(req);
        const installer = mode === "copy" ? copy : symlink;
        await installer.install({ ...req, requestedMode: mode });
        if (action.kind === "install") result.installed.push(action.nodeId);
        else result.updated.push(action.nodeId);
      } else if (action.kind === "prune") result.pruned.push(action.nodeId);
      else if (action.kind === "skip") result.skipped.push(action.nodeId);
      opts.onProgress?.(action, "done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ nodeId: action.nodeId, message: msg });
      opts.onProgress?.(action, "error", err instanceof Error ? err : new Error(msg));
    }
  }
  return result;
}

function deriveAssetType(entry: any): string {
  const [, type] = (entry.id ?? "").split(":");
  return type ?? "skills";
}
