import { z } from "zod";
import { SourceSchema } from "./source.js";

/** §4.3.1 AssetBaseSchema — 6 자산 타입의 공통 베이스. */
export const AssetBaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]+(:[a-z0-9_-]+){1,2}$/),
    source: SourceSchema,
    scope: z.enum(["enterprise", "user", "project", "local"]).optional(),
    target: z.enum(["shared-agents"]).optional(),
    install: z
      .enum(["symlink", "hardlink", "copy", "auto"])
      .default("auto"),
  })
  .loose();

export type AssetBase = z.infer<typeof AssetBaseSchema>;
