import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Winner: jsonc-morph @ 0.3.3 (POC-2 결정, 2026-04-22)
import { createJsoncMorphEditor as createWinnerEditor } from "../../../src/round-trip/jsonc/jsonc-morph.js";

import { computeDiffRegions } from "../../../src/round-trip/diff-regions.js";
import type { Edit } from "../../../src/round-trip/types.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/jsonc");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

// jsonc-morph 는 8/8 true_pass — known limitation 없음
const SKIP_FIXTURES = new Set<string>([]);

describe("POC-2 winner JSONC preservation — 8 scenarios", () => {
  for (const scenario of scenarios) {
    const testFn = SKIP_FIXTURES.has(scenario.fixture) ? it.skip : it;
    testFn(`${scenario.fixture}: ${scenario.description}`, async () => {
      const source = readFileSync(join(FIXTURE_DIR, scenario.fixture), "utf8");
      const editor = createWinnerEditor();
      const doc = await editor.load(source);
      const result = await editor.edit(doc, scenario.edits);
      const regions = computeDiffRegions(source, result.modified);
      const report = editor.verify(source, result.modified, regions);
      expect(report.preserved, `outside diff: ${report.outsideChangesByteCount} bytes`).toBe(true);
      expect(result.editsApplied).toBe(scenario.edits.length);
    });
  }
});
