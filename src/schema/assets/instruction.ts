import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.6 InstructionAsset. */
export const InstructionAssetSchema = AssetBaseSchema.extend({
  type: z.literal("instructions").optional(),
  target: z.enum(["claude-md", "agents-md", "opencode-instructions"]),
  mode: z
    .enum(["file-include", "layered-concat", "array-entry"])
    .optional(),
});
export type InstructionAsset = z.infer<typeof InstructionAssetSchema>;
