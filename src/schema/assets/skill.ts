import { z } from "zod";
import { AssetBaseSchema, type AssetBase } from "../asset-base.js";

/** §4.3.2 SkillAsset. */
export const SkillAssetSchema = AssetBaseSchema.extend({
  type: z.literal("skills").optional(),
});
export type SkillAsset = z.infer<typeof SkillAssetSchema>;

/**
 * 결정 A A1/A4 post-validator.
 * `provider: claude-code` + `target: shared-agents` = parse error.
 * Provider 는 id prefix 에서 추출.
 */
export function checkSkillsPlacement(skills: AssetBase[]): void {
  for (const s of skills) {
    const provider = s.id.split(":")[0];
    if (provider === "claude-code" && s.target === "shared-agents") {
      throw new Error(
        `target: shared-agents is not allowed for claude-code skills (A1/A4, issue #31005 OPEN)\n` +
          `  id: ${s.id}\n` +
          `  remediation: Remove 'target: shared-agents' or use codex/opencode provider.`,
      );
    }
  }
}
