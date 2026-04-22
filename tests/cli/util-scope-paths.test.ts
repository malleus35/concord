import { describe, it, expect } from "vitest";
import { manifestPathForScope } from "../../src/cli/util/scope-paths.js";

describe("scope paths", () => {
  it("user scope → <concordHome>/concord.user.yaml", () => {
    const p = manifestPathForScope("user", { concordHome: "/home/a/.concord", cwd: "/proj" });
    expect(p).toBe("/home/a/.concord/concord.user.yaml");
  });
  it("enterprise scope → <concordHome>/concord.enterprise.yaml", () => {
    const p = manifestPathForScope("enterprise", { concordHome: "/h/.concord", cwd: "/p" });
    expect(p).toBe("/h/.concord/concord.enterprise.yaml");
  });
  it("project scope → <cwd>/concord.yaml", () => {
    const p = manifestPathForScope("project", { concordHome: "/h", cwd: "/proj" });
    expect(p).toBe("/proj/concord.yaml");
  });
  it("local scope → <cwd>/concord.local.yaml", () => {
    const p = manifestPathForScope("local", { concordHome: "/h", cwd: "/proj" });
    expect(p).toBe("/proj/concord.local.yaml");
  });
});
