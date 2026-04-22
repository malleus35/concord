export type DriftStatus = "none" | "source" | "target" | "divergent" | "env";

export interface DriftInput {
  node: { source_digest?: string; target_digest?: string };
  currentSourceDigest: string;
  currentTargetDigest: string | null;
  /** Current env resolve digest (sha256 of resolved values in allowed fields). Optional for backward compat. */
  currentEnvDigest?: string;
  /** Lock-stored env digest. Undefined = legacy lock, skip env check. */
  lockEnvDigest?: string;
}

export function computeDriftStatus(input: DriftInput): DriftStatus {
  const sourceMatches = input.currentSourceDigest === input.node.source_digest;
  const targetMatches =
    input.currentTargetDigest !== null &&
    input.currentTargetDigest === input.node.target_digest;
  if (!sourceMatches && targetMatches) return "source";
  if (sourceMatches && !targetMatches) return "target";
  if (!sourceMatches && !targetMatches) return "divergent";
  // source+target both match → check env
  if (
    input.lockEnvDigest !== undefined &&
    input.currentEnvDigest !== undefined &&
    input.currentEnvDigest !== input.lockEnvDigest
  ) {
    return "env";
  }
  return "none";
}
