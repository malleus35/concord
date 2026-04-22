import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";
import { SourceSchema } from "../source.js";

/** §4.3.4 HookAsset — 2-자산 분리 (registration + implementation). */
export const HookAssetSchema = AssetBaseSchema.extend({
  type: z.literal("hooks").optional(),
  event: z.string(),
  registration: z
    .object({
      matcher: z.string().optional(),
      if_condition: z.string().optional(),
      command: z.string().optional(),
      hook_type: z.enum(["command", "http", "prompt", "agent"]).optional(),
    })
    .optional(),
  implementation: z
    .object({
      source: SourceSchema,
      target_path: z.string(),
    })
    .optional(),
}).refine(
  (h) => h.registration !== undefined || h.implementation !== undefined,
  { message: "hooks require at least registration or implementation" },
);
export type HookAsset = z.infer<typeof HookAssetSchema>;
