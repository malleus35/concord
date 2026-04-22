/**
 * POC-3 YAML Write-back Benchmark Runner
 *
 * 실행: `npm run poc:3` 또는 `npx tsx scripts/poc/poc-3-yaml.ts`
 * 목적: eemeli/yaml 의 CST 레벨 write-back 에서
 *       주석 보존 / bytes delta / byte-level preservation 실측
 * 출력: stdout JSON + stderr progress/summary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createEemeliYamlEditor } from "../../src/round-trip/yaml/eemeli.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/yaml");
const scenarios = JSON.parse(
  readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"),
).scenarios as Array<{ fixture: string; description: string; edits: Edit[] }>;

async function main() {
  const results: Array<Record<string, unknown>> = [];
  for (const sc of scenarios) {
    const source = readFileSync(join(FIXTURE_DIR, sc.fixture), "utf8");
    const editor = createEemeliYamlEditor();
    const t0 = performance.now();
    try {
      const doc = await editor.load(source);
      const edit = await editor.edit(doc, sc.edits);
      const regions = computeDiffRegions(source, edit.modified);
      const report = editor.verify(source, edit.modified, regions);
      const originalComments = [...source.matchAll(/#.*/g)].map((m) => m[0]);
      const modifiedComments = [...edit.modified.matchAll(/#.*/g)].map((m) => m[0]);
      const commentsPreserved = originalComments.every((c) => modifiedComments.includes(c));
      const commentCount = {
        original: originalComments.length,
        modified: modifiedComments.length,
      };
      const elapsed = performance.now() - t0;
      const result = {
        fixture: sc.fixture,
        bytePreserved: report.preserved,
        commentsPreserved,
        commentCount,
        outsideBytes: report.outsideChangesByteCount,
        originalBytes: edit.originalBytes,
        modifiedBytes: edit.modifiedBytes,
        bytesDeltaPercent: (
          ((edit.modifiedBytes - edit.originalBytes) / edit.originalBytes) *
          100
        ).toFixed(1),
        elapsedMs: elapsed,
      };
      results.push(result);
      console.error(
        `[eemeli/yaml] ${sc.fixture}: commentsPreserved=${commentsPreserved} bytePreserved=${report.preserved} delta=${result.bytesDeltaPercent}% (${elapsed.toFixed(2)}ms)`,
      );
    } catch (err) {
      const elapsed = performance.now() - t0;
      results.push({
        fixture: sc.fixture,
        error: err instanceof Error ? err.message : String(err),
        elapsedMs: elapsed,
      });
      console.error(`[eemeli/yaml] ${sc.fixture}: ERROR ${err} (${elapsed.toFixed(2)}ms)`);
    }
  }
  console.log(JSON.stringify({ results }, null, 2));

  console.error("\n=== POC-3 Summary (eemeli/yaml write-back) ===");
  const pass = results.filter((r) => !r["error"] && r["commentsPreserved"] === true).length;
  const fail = results.filter((r) => !r["error"] && r["commentsPreserved"] === false).length;
  const errors = results.filter((r) => !!r["error"]).length;
  console.error(`commentsPreserved: ${pass}/${scenarios.length} | fail: ${fail} | error: ${errors}`);
  console.table(
    results.map((r) => ({
      fixture: r["fixture"],
      bytePreserved: r["bytePreserved"] ?? "ERR",
      commentsPreserved: r["commentsPreserved"] ?? "ERR",
      origComments: (r["commentCount"] as Record<string, number> | undefined)?.original ?? "ERR",
      modComments: (r["commentCount"] as Record<string, number> | undefined)?.modified ?? "ERR",
      deltaPercent: r["bytesDeltaPercent"] ?? "ERR",
      elapsedMs: typeof r["elapsedMs"] === "number" ? r["elapsedMs"].toFixed(2) : "ERR",
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
