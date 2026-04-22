import { z } from "zod";
import semver from "semver";
import { SkillAssetSchema } from "./assets/skill.js";
import { SubagentAssetSchema } from "./assets/subagent.js";
import { HookAssetSchema } from "./assets/hook.js";
import { McpServerAssetSchema } from "./assets/mcp-server.js";
import { InstructionAssetSchema } from "./assets/instruction.js";
import { PluginAssetSchema } from "./assets/plugin.js";

/** §4.2 top-level ManifestSchema. */
export const ManifestSchema = z
  .object({
    concord_version: z
      .string()
      .regex(/^[\^~>=<\s\d.*x|-]+$/, "must be a semver range")
      .optional(),
    skills: z.array(SkillAssetSchema).optional().default([]),
    subagents: z.array(SubagentAssetSchema).optional().default([]),
    hooks: z.array(HookAssetSchema).optional().default([]),
    mcp_servers: z.array(McpServerAssetSchema).optional().default([]),
    instructions: z.array(InstructionAssetSchema).optional().default([]),
    plugins: z.array(PluginAssetSchema).optional().default([]),
  })
  .loose();

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * §4.6 concord_version constraint check.
 * - undefined: caller 가 warning 을 emit 할 수 있도록 허용 (fail-closed 아님)
 * - invalid constraint: parse error (fail-closed)
 * - current 가 constraint 불만족: fail-closed
 */
export function checkConcordVersion(
  constraint: string | undefined,
  current: string,
): void {
  if (constraint === undefined) return;

  const valid = semver.validRange(constraint);
  if (valid === null) {
    throw new Error(
      `concord_version: invalid semver range '${constraint}' (§4.6)`,
    );
  }

  if (!semver.satisfies(current, constraint)) {
    throw new Error(
      `concord_version mismatch: current=${current} does not satisfy '${constraint}' (§4.6 fail-closed)`,
    );
  }
}
