import { join } from "node:path";
import type { ConfigScope } from "../../schema/types.js";

export interface ScopeContext {
  concordHome: string;
  cwd: string;
}

/** §11.5 scope → manifest path mapping. */
export function manifestPathForScope(scope: ConfigScope, ctx: ScopeContext): string {
  switch (scope) {
    case "enterprise": return join(ctx.concordHome, "concord.enterprise.yaml");
    case "user":       return join(ctx.concordHome, "concord.user.yaml");
    case "project":    return join(ctx.cwd, "concord.yaml");
    case "local":      return join(ctx.cwd, "concord.local.yaml");
  }
}
