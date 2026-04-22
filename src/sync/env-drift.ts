import { resolveEntry } from "../secret/resolve-entry.js";
import type { ResolverContext } from "../secret/types.js";

export interface EnvDriftResult {
  hasDrift: boolean;
  currentDigest: string;
  lockDigest: string | undefined;
}

export function computeEnvDrift(
  entry: Record<string, unknown>,
  lockNode: { env_digest?: string },
  ctx: ResolverContext,
): EnvDriftResult {
  const resolved = resolveEntry(entry, ctx);
  const lockDigest = lockNode.env_digest;

  // If entry has no interpolations OR lock is legacy (no env_digest), no drift concern.
  if (resolved.resolvedFields.size === 0) {
    return { hasDrift: false, currentDigest: resolved.envDigest, lockDigest };
  }
  if (lockDigest === undefined) {
    return { hasDrift: false, currentDigest: resolved.envDigest, lockDigest };
  }
  return {
    hasDrift: resolved.envDigest !== lockDigest,
    currentDigest: resolved.envDigest,
    lockDigest,
  };
}
