export type NodeState = "installed" | "outdated" | "missing";
export type NodeEvent = "integrity-mismatch" | "install-failed";

export interface StateContext {
  currentState: NodeState;
  lastKnownDigest: string | null;
  currentDigest: string | null;
}

export function determineState(ctx: StateContext): NodeState {
  if (ctx.currentDigest === null) return "missing";
  if (ctx.lastKnownDigest === null) return "installed";
  if (ctx.currentDigest !== ctx.lastKnownDigest) return "outdated";
  return "installed";
}

export function shouldEmitEvent(ctx: StateContext): NodeEvent | null {
  if (ctx.currentDigest === null && ctx.lastKnownDigest !== null) return "install-failed";
  if (ctx.lastKnownDigest !== null && ctx.currentDigest !== null && ctx.currentDigest !== ctx.lastKnownDigest) {
    return "integrity-mismatch";
  }
  return null;
}
