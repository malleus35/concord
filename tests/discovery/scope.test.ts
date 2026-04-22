import { describe, expect, it } from "vitest";
import { mergeByPrecedence } from "../../src/discovery/scope.js";
import type { Manifest } from "../../src/schema/manifest.js";

function m(id: string): Manifest {
  return {
    skills: [
      { id, source: { type: "file", path: "./x" }, install: "auto" },
    ],
    subagents: [],
    hooks: [],
    mcp_servers: [],
    instructions: [],
    plugins: [],
  } as Manifest;
}

describe("mergeByPrecedence (§11.5)", () => {
  it("local overrides project overrides user overrides enterprise", () => {
    const enterprise = m("claude-code:skills:x");
    const user = m("claude-code:skills:x");
    const project = m("claude-code:skills:x");
    const local = m("claude-code:skills:x");

    const merged = mergeByPrecedence({ enterprise, user, project, local });
    expect(merged.skills).toHaveLength(1);
    expect(merged.skills[0]?.id).toBe("claude-code:skills:x");
  });

  it("merges distinct ids across scopes", () => {
    const user = m("claude-code:skills:a");
    const project = m("claude-code:skills:b");
    const merged = mergeByPrecedence({ user, project });
    const ids = merged.skills.map((s) => s.id).sort();
    expect(ids).toEqual([
      "claude-code:skills:a",
      "claude-code:skills:b",
    ]);
  });

  it("works with undefined scopes", () => {
    const merged = mergeByPrecedence({ user: m("claude-code:skills:x") });
    expect(merged.skills).toHaveLength(1);
  });
});
