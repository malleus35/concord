import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigScope } from "../schema/types.js";

export interface AdoptContextArgs {
  cwd: string;
  /** Explicit --scope; null means "use D-W1 default". */
  explicitScope: ConfigScope | null;
}

/**
 * §6.4.1 D-W1. Returns the ordered list of scopes to scan.
 * - explicitScope !== null → [explicit] (override; enterprise/local always explicit)
 * - cwd has concord.yaml → ["user", "project"]
 * - otherwise → ["user"]
 */
export async function determineAdoptScopes(args: AdoptContextArgs): Promise<ConfigScope[]> {
  if (args.explicitScope !== null) return [args.explicitScope];
  const hasProject = await stat(join(args.cwd, "concord.yaml")).then(() => true).catch(() => false);
  return hasProject ? ["user", "project"] : ["user"];
}
