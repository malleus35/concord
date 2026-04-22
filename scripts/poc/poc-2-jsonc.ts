/**
 * POC-2 JSONC Library Benchmark Runner
 *
 * 실행: `npm run poc:2` 또는 `npx tsx scripts/poc/poc-2-jsonc.ts`
 * 출력: stdout JSON + stderr progress/summary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createJsoncMorphEditor } from "../../src/round-trip/jsonc/jsonc-morph.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/jsonc");
const scenarios = JSON.parse(
  readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"),
).scenarios as Array<{ fixture: string; description: string; edits: Edit[] }>;

const libraries = [
  { name: "jsonc-morph", factory: createJsoncMorphEditor },
];

type Result = {
  library: string;
  fixture: string;
  status: "pass" | "fail-preserve" | "error";
  outsideChangesByteCount?: number;
  elapsedMs: number;
  errorMessage?: string;
  originalBytes: number;
  modifiedBytes: number;
};

async function main() {
  const results: Result[] = [];
  for (const lib of libraries) {
    for (const sc of scenarios) {
      const source = readFileSync(join(FIXTURE_DIR, sc.fixture), "utf8");
      const editor = lib.factory();
      const t0 = performance.now();
      try {
        const doc = await editor.load(source);
        const edit = await editor.edit(doc, sc.edits);
        const regions = computeDiffRegions(source, edit.modified);
        const report = editor.verify(source, edit.modified, regions);
        results.push({
          library: lib.name,
          fixture: sc.fixture,
          status: report.preserved ? "pass" : "fail-preserve",
          outsideChangesByteCount: report.outsideChangesByteCount,
          elapsedMs: performance.now() - t0,
          originalBytes: edit.originalBytes,
          modifiedBytes: edit.modifiedBytes,
        });
      } catch (err) {
        results.push({
          library: lib.name,
          fixture: sc.fixture,
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
          elapsedMs: performance.now() - t0,
          originalBytes: Buffer.byteLength(source, "utf8"),
          modifiedBytes: 0,
        });
      }
      const last = results[results.length - 1]!;
      console.error(`[${last.library}] ${last.fixture}: ${last.status} (${last.elapsedMs.toFixed(2)}ms)`);
    }
  }
  console.log(JSON.stringify({ results }, null, 2));

  const summary = libraries.map((lib) => {
    const libResults = results.filter((r) => r.library === lib.name);
    return {
      library: lib.name,
      pass: libResults.filter((r) => r.status === "pass").length,
      failPreserve: libResults.filter((r) => r.status === "fail-preserve").length,
      error: libResults.filter((r) => r.status === "error").length,
      totalMs: libResults.reduce((a, r) => a + r.elapsedMs, 0),
    };
  });
  console.error("\n=== POC-2 Summary ===");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
