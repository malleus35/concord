import { ManifestSchema, type Manifest } from "./manifest.js";
import { checkSkillsPlacement } from "./assets/skill.js";
import {
  checkReserved,
  ReservedIdentifierError,
} from "./reserved-identifier-registry.js";
import {
  containsInterpolation,
  isAllowedField,
  checkNested,
  InterpolationError,
} from "./interpolation-allowlist.js";
import type { AssetBase } from "./asset-base.js";

/**
 * 3-pass validator (§4.8):
 *   1. pre-validation: Reserved identifier + interpolation allowlist + nested
 *      + D-11 case-insensitive collision (id 정규식이 소문자 전용이지만 원본
 *        raw 에는 대소문자 혼합이 들어올 수 있으므로 Zod 전에 선제 감지)
 *   2. Zod parse (ManifestSchema)
 *   3. post-validation: A1/A4 placement
 */
export function validateManifest(raw: unknown): Manifest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("manifest must be an object");
  }

  // 1) Pre-validation
  preValidate(raw as Record<string, unknown>);
  checkCaseCollisionRaw(raw as Record<string, unknown>);

  // 2) Zod parse
  const parsed = ManifestSchema.parse(raw);

  // 3) Post-validation
  checkSkillsPlacement(parsed.skills as AssetBase[]);

  return parsed;
}

function preValidate(obj: Record<string, unknown>): void {
  walk(obj, "", (path, value) => {
    // Reserved field names (top-level 또는 자산 수준)
    const leaf = path.split(".").pop() ?? "";
    if (
      ["include", "exclude", "allow_disassemble", "disassembled_sources"].includes(
        leaf,
      )
    ) {
      throw new ReservedIdentifierError(
        leaf,
        { file: "<manifest>", line: 0, col: 0 },
        {
          kind: "field",
          reason:
            leaf === "include" || leaf === "exclude"
              ? "Phase 2 cross_sync: section"
              : "Phase 2 asset-level IR",
          phase2Replacement:
            leaf === "include" || leaf === "exclude"
              ? "cross_sync: (Phase 2 신규 섹션)"
              : null,
        },
      );
    }

    if (typeof value !== "string") return;

    // Reserved interpolation patterns
    checkReserved(value, { file: "<manifest>", line: 0, col: 0 });

    // Interpolation allowlist (§4.5)
    if (
      containsInterpolation(value) &&
      !isAllowedField(normalizeFieldPath(path))
    ) {
      throw new InterpolationError(
        `interpolation not allowed in field '${path}' (E-7 allowlist)`,
        `value: ${value}`,
      );
    }

    // E-9 nested
    if (containsInterpolation(value)) {
      checkNested(value);
    }
  });
}

/** Leaf path: "skills[0].source.url" → "source.url" (배열 인덱스 제거). */
function normalizeFieldPath(fullPath: string): string {
  return fullPath.replace(/^[^.]+\./, "").replace(/\[\d+\]/g, "");
}

function walk(
  obj: unknown,
  path: string,
  fn: (path: string, value: unknown) => void,
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${path}[${i}]`, fn));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const nextPath = path === "" ? k : `${path}.${k}`;
      fn(nextPath, v);
      walk(v, nextPath, fn);
    }
    return;
  }
  fn(path, obj);
}

/**
 * D-11 case-insensitive 충돌 감지 (Zod parse 전 raw 단계).
 * Zod 의 id 정규식은 소문자 전용이므로, 대소문자 혼합 id 가 존재해도 Zod 에서
 * 먼저 reject 되지 않도록 **pre-validation** 에서 선제적으로 확인한다.
 */
function checkCaseCollisionRaw(raw: Record<string, unknown>): void {
  const listKeys = [
    "skills",
    "subagents",
    "hooks",
    "mcp_servers",
    "instructions",
    "plugins",
  ] as const;

  const allIds: string[] = [];
  for (const key of listKeys) {
    const list = raw[key];
    if (!Array.isArray(list)) continue;
    for (const a of list) {
      if (
        a &&
        typeof a === "object" &&
        "id" in a &&
        typeof (a as { id: unknown }).id === "string"
      ) {
        allIds.push((a as { id: string }).id);
      }
    }
  }

  const seen = new Map<string, string>();
  for (const id of allIds) {
    const lower = id.toLowerCase();
    if (seen.has(lower) && seen.get(lower) !== id) {
      throw new Error(
        `error: case-insensitive name collision\n` +
          `  identifiers: ${seen.get(lower)}, ${id}\n` +
          `  reason: Concord requires names to be unique on case-insensitive filesystems (D-11).`,
      );
    }
    seen.set(lower, id);
  }
}
