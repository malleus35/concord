import { loadYaml } from "../../io/yaml-loader.js";
import {
  checkReserved,
  ReservedIdentifierError,
} from "../../schema/reserved-identifier-registry.js";
import {
  containsInterpolation,
  isAllowedField,
  checkNested,
  InterpolationError,
} from "../../schema/interpolation-allowlist.js";

/** Lint = pre-validation only. Reserved + allowlist + nested. */
export async function lintCommand(manifestPath: string): Promise<number> {
  try {
    const raw = loadYaml(manifestPath);
    walk(raw, "", (p, value) => {
      const leaf = p.split(".").pop() ?? "";
      if (
        ["include", "exclude", "allow_disassemble", "disassembled_sources"].includes(
          leaf,
        )
      ) {
        throw new ReservedIdentifierError(
          leaf,
          { file: manifestPath, line: 0, col: 0 },
          {
            kind: "field",
            reason: "Phase 2 reserved",
            phase2Replacement: null,
          },
        );
      }
      if (typeof value !== "string") return;
      checkReserved(value, { file: manifestPath, line: 0, col: 0 });
      if (containsInterpolation(value)) {
        if (!isAllowedField(p.replace(/^[^.]+\./, "").replace(/\[\d+\]/g, ""))) {
          throw new InterpolationError(
            `interpolation not allowed in field '${p}' (E-7)`,
            `value: ${value}`,
          );
        }
        checkNested(value);
      }
    });
    console.log(`LINT OK: ${manifestPath}`);
    return 0;
  } catch (e) {
    console.error(`LINT FAIL: ${manifestPath}`);
    console.error((e as Error).message);
    return 1;
  }
}

function walk(
  obj: unknown,
  p: string,
  fn: (p: string, value: unknown) => void,
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${p}[${i}]`, fn));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const next = p === "" ? k : `${p}.${k}`;
      fn(next, v);
      walk(v, next, fn);
    }
    return;
  }
  fn(p, obj);
}
