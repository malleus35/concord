import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";
import { PluginSourceSchema } from "../source.js";

/** §4.3.7 PluginAsset (β3 α). Plugin 은 source 로 PluginSourceSchema (3 types) 만 허용. */
export const PluginAssetSchema = AssetBaseSchema.omit({ source: true }).extend({
  type: z.literal("plugins").optional(),
  source: PluginSourceSchema,
  auto_install: z.boolean().default(true),
  enabled: z.boolean().default(true),
  purge_on_remove: z.boolean().default(false),
  dependencies: z.array(z.string()).optional(),
  min_engine: z.string().optional(),
});
export type PluginAsset = z.infer<typeof PluginAssetSchema>;
