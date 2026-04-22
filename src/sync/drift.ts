export type DriftStatus = "none" | "source" | "target" | "divergent";

export interface DriftInput {
  node: { source_digest?: string; target_digest?: string };
  currentSourceDigest: string;
  currentTargetDigest: string | null;
}

export function computeDriftStatus(input: DriftInput): DriftStatus {
  const sourceMatches = input.currentSourceDigest === input.node.source_digest;
  const targetMatches = input.currentTargetDigest !== null && input.currentTargetDigest === input.node.target_digest;
  if (sourceMatches && targetMatches) return "none";
  if (!sourceMatches && targetMatches) return "source";
  if (sourceMatches && !targetMatches) return "target";
  return "divergent";
}
