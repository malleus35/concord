import { z } from "zod";
import { ConfigScope } from "./types.js";
import { CapabilityMatrixSchema } from "./capability-matrix.js";
import { LockNodeSchema } from "./lock-node.js";

/** §5.1 top-level LockSchema + §5.9 phase2_projections optional + §7.3.1 refine. */
export const LockSchema = z
  .object({
    lockfile_version: z.literal(1),
    generated_at: z.iso.datetime(), // Zod 4: top-level iso namespace
    generated_by: z.string(),
    scope: ConfigScope,
    roots: z.array(z.string()),
    nodes: z.record(z.string(), LockNodeSchema),
    capability_matrix: CapabilityMatrixSchema,
    // §5.9 Phase 1 에선 optional — 위치 미확정 (M5)
    phase2_projections: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (lock) => {
      // §7.3.1 Symlink drift cross-check: install_mode=symlink 이면 drift ∈ {none, source, env-drift}
      for (const node of Object.values(lock.nodes)) {
        if (
          node.install_mode === "symlink" &&
          !["none", "source", "env-drift"].includes(node.drift_status)
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "symlink install_mode cannot have target/divergent drift_status (§7.3.1)",
    },
  );
export type Lock = z.infer<typeof LockSchema>;
