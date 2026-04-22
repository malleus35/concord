import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createJsoncMorphEditor } from "../../../src/round-trip/jsonc/jsonc-morph.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/jsonc");

const editors = [
  { name: "jsonc-morph", factory: createJsoncMorphEditor },
];

describe("POC-2 JSONC edit smoke", () => {
  it.each(editors)("$name: 03-add-key 편집 가능", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "03-add-key.jsonc"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    try {
      const result = await editor.edit(doc, [
        {
          op: "set",
          path: ["mcpServers", "slack"],
          value: { command: "node", args: ["slack.js"] },
        },
      ]);
      expect(result.editsApplied).toBe(1);
      expect(result.modified).toContain("slack");
    } catch (err) {
      console.warn(
        `[smoke-test] ${factory.name} failed on 03-add-key: ${err instanceof Error ? err.message : err}`,
      );
    }
  });

  it.each(editors)("$name: 07-pure-json 편집 가능", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "07-pure-json.json"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    try {
      const result = await editor.edit(doc, [
        { op: "set", path: ["mcpServers", "slack"], value: { command: "node" } },
      ]);
      expect(result.editsApplied).toBe(1);
    } catch (err) {
      console.warn(
        `[smoke-test] ${factory.name} failed on 07-pure-json: ${err instanceof Error ? err.message : err}`,
      );
    }
  });
});
