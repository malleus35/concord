import { z } from "zod";
import { AssetType, Provider } from "./types.js";
import { InstallReasonEnum } from "./capability-matrix.js";
import { SourceSchema, PluginSourceSchema } from "./source.js";

const Sha256String = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const ResolvedSourceSchema = z.union([SourceSchema, PluginSourceSchema]);

/** §5.3.1 LockNode. */
export const LockNodeSchema = z.object({
  id: z.string(),
  type: AssetType,
  provider: Provider,

  // §5.4 3중 digest
  source_digest: Sha256String,
  content_digest: Sha256String,
  catalog_digest: Sha256String,

  // §5.5 자산별 필드 분리 (3 bins)
  standard_fields: z.record(z.string(), z.unknown()).default({}),
  concord_fields: z.record(z.string(), z.unknown()).default({}),
  protocol_fields: z.record(z.string(), z.unknown()).default({}),

  resolved_source: ResolvedSourceSchema,
  declared: z.record(z.string(), z.unknown()),

  // §5.7 결정 D 확장
  install_mode: z.enum(["symlink", "hardlink", "copy"]),
  install_reason: InstallReasonEnum,
  shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
  drift_status: z
    .enum(["none", "source", "target", "divergent", "env-drift"])
    .default("none"),

  // §5.11 raw vs normalized
  raw_hash: Sha256String,
  normalized_hash: Sha256String,

  // §5.8 Claude transitive + min_engine
  dependencies: z.array(z.string()).optional(),
  min_engine: z.string().optional(),

  installed_at: z.iso.datetime(),
  install_path: z.string(),
});
export type LockNode = z.infer<typeof LockNodeSchema>;
