import * as fs from "node:fs";
import YAML from "yaml";

/**
 * §10.1 POC-3 확정: eemeli/yaml (`yaml` npm) — format-preserving.
 * Plan 1 에선 read-only. Plan 2 의 round-trip writer 는 별도 모듈.
 */
export function loadYaml(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(raw);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`YAML file '${filePath}' did not parse to an object`);
  }
  return parsed as Record<string, unknown>;
}
