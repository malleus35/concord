import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.3 SubagentAsset. */
export const SubagentAssetSchema = AssetBaseSchema.extend({
  type: z.literal("subagents").optional(),
  format: z.enum(["md-yaml", "toml"]).optional(),
});
export type SubagentAsset = z.infer<typeof SubagentAssetSchema>;
