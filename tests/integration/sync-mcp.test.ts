import { describe, it, expect } from "vitest";
import { createJsoncWriter } from "../../src/write/jsonc.js";
import { createTomlWriter } from "../../src/write/toml.js";
import { computeHashSuffix } from "../../src/round-trip/marker.js";

describe("E2E: MCP round-trip", () => {
  it("JSONC: 여러 marker + 사용자 영역 보존", async () => {
    const w = createJsoncWriter();
    const src = `{
  // my mcp
  "mcpServers": { "user": { "command": "node" } }
}`;
    const c1 = '"airtable": { "command": "npx" }';
    const c2 = '"slack": { "command": "node" }';
    const r1 = await w.write({ source: src, ops: [{ op: "upsertBlock", id: "mcp:a", content: c1, hashSuffix: computeHashSuffix(c1) }] });
    const r2 = await w.write({ source: r1.modified, ops: [{ op: "upsertBlock", id: "mcp:s", content: c2, hashSuffix: computeHashSuffix(c2) }] });
    expect(r2.modified).toContain("airtable");
    expect(r2.modified).toContain("slack");
    expect(r2.modified).toContain('"user"');
  });

  it("TOML: marker + [features] 보존", async () => {
    const w = createTomlWriter();
    const src = `[features]\ncodex_hooks = true\n`;
    const c = `[mcp_servers.a]\ncommand = "npx"`;
    const r = await w.write({ source: src, ops: [{ op: "upsertBlock", id: "mcp:a", content: c, hashSuffix: computeHashSuffix(c) }] });
    expect(r.modified).toContain("[features]");
    expect(r.modified).toContain("[mcp_servers.a]");
  });
});
