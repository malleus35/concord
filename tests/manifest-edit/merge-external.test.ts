import { describe, it, expect } from "vitest";
import { mergeExternal } from "../../src/manifest-edit/merge-external.js";

describe("mergeExternal", () => {
  it("appends new entries from external", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /x }\n`;
    const ext = {
      skills: [
        { id: "bar", source: { type: "file", path: "/y" } },
      ],
    };
    const r = mergeExternal(own, ext, "skip");
    expect(r.merged).toContain("id: foo");
    expect(r.merged).toContain("id: bar");
    expect(r.conflicts).toEqual([]);
  });

  it("skip policy leaves own entry when conflict", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`;
    const ext = { skills: [{ id: "foo", source: { type: "file", path: "/theirs" } }] };
    const r = mergeExternal(own, ext, "skip");
    expect(r.merged).toContain("/mine");
    expect(r.merged).not.toContain("/theirs");
    expect(r.conflicts[0]).toEqual({ assetType: "skills", id: "foo", action: "skipped" });
  });

  it("replace policy overwrites own entry", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`;
    const ext = { skills: [{ id: "foo", source: { type: "file", path: "/theirs" } }] };
    const r = mergeExternal(own, ext, "replace");
    expect(r.merged).toContain("/theirs");
    expect(r.merged).not.toContain("/mine");
    expect(r.conflicts[0]).toEqual({ assetType: "skills", id: "foo", action: "replaced" });
  });

  it("alias policy appends with -ext suffix", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`;
    const ext = { skills: [{ id: "foo", source: { type: "file", path: "/theirs" } }] };
    const r = mergeExternal(own, ext, "alias");
    expect(r.merged).toContain("id: foo-ext");
    expect(r.merged).toContain("/mine");
    expect(r.merged).toContain("/theirs");
    expect(r.conflicts[0]).toEqual({ assetType: "skills", id: "foo", action: "aliased" });
  });

  it("ignores non-object entries and missing ids", () => {
    const own = `skills: []\n`;
    const ext = { skills: [null, { noId: true }, "string", { id: "real", source: { type: "file", path: "/x" } }] };
    const r = mergeExternal(own, ext as any, "skip");
    expect(r.merged).toContain("id: real");
    expect(r.conflicts).toEqual([]);
  });
});
