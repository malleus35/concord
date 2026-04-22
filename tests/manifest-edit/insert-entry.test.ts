import { describe, it, expect } from "vitest";
import { insertEntry } from "../../src/manifest-edit/insert-entry.js";

describe("manifest insertEntry", () => {
  it("appends to an empty list", () => {
    const src = `# top comment\nconcord_version: ">=0.1"\nskills: []\n`;
    const out = insertEntry(src, "skills", {
      id: "claude-code:skills:code-reviewer",
      source: { type: "file", path: "~/.claude/skills/code-reviewer" },
    });
    expect(out).toContain("# top comment");
    expect(out).toContain("code-reviewer");
  });

  it("preserves existing entry's comments when adding a new one", () => {
    const src = `skills:\n  # existing\n  - id: claude-code:skills:older\n    source: { type: file, path: /x }\n`;
    const out = insertEntry(src, "skills", {
      id: "claude-code:skills:newer",
      source: { type: "file", path: "/y" },
    });
    expect(out).toContain("# existing");
    expect(out).toContain("claude-code:skills:older");
    expect(out).toContain("claude-code:skills:newer");
  });

  it("throws on duplicate id", () => {
    const src = `skills:\n  - id: foo\n    source: { type: file, path: /x }\n`;
    expect(() => insertEntry(src, "skills", { id: "foo", source: { type: "file", path: "/y" } })).toThrow(/duplicate/i);
  });

  it("creates the asset key when it is entirely missing", () => {
    const src = `concord_version: ">=0.1"\n`;
    const out = insertEntry(src, "skills", { id: "fresh", source: { type: "file", path: "/x" } });
    expect(out).toContain("concord_version");
    expect(out).toContain("skills:");
    expect(out).toContain("fresh");
  });
});
