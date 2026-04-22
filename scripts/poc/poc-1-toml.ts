/**
 * POC-1 TOML Library Benchmark Runner
 *
 * 실행: `npm run poc:1` 또는 `npx tsx scripts/poc/poc-1-toml.ts`
 * 출력: stdout JSON + stderr progress/summary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createDecimalturnEditor } from "../../src/round-trip/toml/decimalturn.js";
import { createShopifyEditor } from "../../src/round-trip/toml/shopify.js";
import { createLtdJTomlEditor } from "../../src/round-trip/toml/ltd-j-toml.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/toml");
const scenarios = JSON.parse(
  readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"),
).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

const libraries = [
  { name: "decimalturn", factory: createDecimalturnEditor },
  { name: "shopify", factory: createShopifyEditor },
  { name: "ltd-j-toml", factory: createLtdJTomlEditor },
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

async function runOne(
  libName: string,
  factory: () => ReturnType<typeof createDecimalturnEditor>,
  scenario: (typeof scenarios)[0],
): Promise<Result> {
  const source = readFileSync(join(FIXTURE_DIR, scenario.fixture), "utf8");
  const editor = factory();
  const t0 = performance.now();
  try {
    const doc = await editor.load(source);
    const editResult = await editor.edit(doc, scenario.edits);
    const regions = computeDiffRegions(source, editResult.modified);
    const report = editor.verify(source, editResult.modified, regions);
    const elapsedMs = performance.now() - t0;

    return {
      library: libName,
      fixture: scenario.fixture,
      status: report.preserved ? "pass" : "fail-preserve",
      outsideChangesByteCount: report.outsideChangesByteCount,
      elapsedMs,
      originalBytes: editResult.originalBytes,
      modifiedBytes: editResult.modifiedBytes,
    };
  } catch (err) {
    return {
      library: libName,
      fixture: scenario.fixture,
      status: "error",
      elapsedMs: performance.now() - t0,
      errorMessage: err instanceof Error ? err.message : String(err),
      originalBytes: Buffer.byteLength(source, "utf8"),
      modifiedBytes: 0,
    };
  }
}

async function main() {
  const results: Result[] = [];
  for (const lib of libraries) {
    for (const sc of scenarios) {
      const r = await runOne(lib.name, lib.factory, sc);
      results.push(r);
      console.error(`[${r.library}] ${r.fixture}: ${r.status} (${r.elapsedMs.toFixed(2)}ms)`);
    }
  }
  console.log(JSON.stringify({ results }, null, 2));

  // 합격 통계
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
  console.error("\n=== POC-1 Summary ===");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
