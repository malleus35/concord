import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.5 McpServerAsset. */
export const McpServerAssetSchema = AssetBaseSchema.extend({
  type: z.literal("mcp_servers").optional(),
  transport: z.enum(["stdio", "sse", "http"]).default("stdio"),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type McpServerAsset = z.infer<typeof McpServerAssetSchema>;
