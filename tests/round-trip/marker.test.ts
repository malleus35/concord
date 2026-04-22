import { describe, it, expect } from "vitest";
import { findMarkerBlocks, emitMarkerBlock, computeHashSuffix } from "../../src/round-trip/marker.js";

describe("marker block parser", () => {
  it("JSONC marker 쌍 인식", () => {
    const source = `{
  "mcpServers": {
    // >>>> concord-managed:mcp_servers:airtable  (hash:abcd1234)
    "airtable": { "command": "npx" }
    // <<<< concord-managed:mcp_servers:airtable
  }
}`;
    const blocks = findMarkerBlocks(source, "//");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("mcp_servers:airtable");
    expect(blocks[0].hashSuffix).toBe("abcd1234");
  });

  it("TOML marker 쌍 인식 (# 주석)", () => {
    const source = `[features]
codex_hooks = true

# >>>> concord-managed:mcp_servers:airtable  (hash:deadbeef)
[mcp_servers.airtable]
command = "npx"
# <<<< concord-managed:mcp_servers:airtable
`;
    const blocks = findMarkerBlocks(source, "#");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("mcp_servers:airtable");
  });

  it("open 없이 close 만 → marker-broken", () => {
    expect(() => findMarkerBlocks("// <<<< concord-managed:x:y\n", "//")).toThrow(/marker-broken/);
  });

  it("중첩 marker → parse error", () => {
    const source = `// >>>> concord-managed:a:1  (hash:11111111)
// >>>> concord-managed:b:2  (hash:22222222)
// <<<< concord-managed:b:2
// <<<< concord-managed:a:1`;
    expect(() => findMarkerBlocks(source, "//")).toThrow(/nested|marker-broken/);
  });

  it("emitMarkerBlock: id + hash + content 생성", () => {
    const out = emitMarkerBlock({
      id: "mcp_servers:slack",
      hashSuffix: "cafebabe",
      commentPrefix: "//",
      content: '"slack": { "command": "node" }',
    });
    expect(out).toContain("// >>>> concord-managed:mcp_servers:slack  (hash:cafebabe)");
    expect(out).toContain("// <<<< concord-managed:mcp_servers:slack");
  });

  it("computeHashSuffix: 안정적 8자 prefix", () => {
    expect(computeHashSuffix("hello")).toMatch(/^[0-9a-f]{8}$/);
    expect(computeHashSuffix("hello")).toBe(computeHashSuffix("hello"));
  });
});
