import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { loadYaml } from "../../src/io/yaml-loader.js";
import { validateManifest } from "../../src/schema/validate-manifest.js";
import { mergeByPrecedence } from "../../src/discovery/scope.js";

function loadAndValidate(fixture: string) {
  return validateManifest(
    loadYaml(path.resolve(__dirname, "../fixtures/", fixture)),
  );
}

describe("POC-13 4-scope merge golden test", () => {
  it("local > project > user > enterprise — shared entry ends up with local version", () => {
    const merged = mergeByPrecedence({
      enterprise: loadAndValidate("manifest-enterprise.yaml"),
      user: loadAndValidate("manifest-user.yaml"),
      project: loadAndValidate("manifest-project.yaml"),
      local: loadAndValidate("manifest-local.yaml"),
    });

    const ids = merged.skills.map((s) => s.id).sort();
    expect(ids).toEqual([
      "claude-code:skills:project-only",
      "claude-code:skills:shared",
      "claude-code:skills:user-only",
    ]);

    const shared = merged.skills.find(
      (s) => s.id === "claude-code:skills:shared",
    );
    expect(shared).toBeDefined();
    expect((shared!.source as { path: string }).path).toBe("./shared-v3-local");
  });

  it("project overrides user+enterprise for shared entries", () => {
    const merged = mergeByPrecedence({
      enterprise: loadAndValidate("manifest-enterprise.yaml"),
      user: loadAndValidate("manifest-user.yaml"),
      project: loadAndValidate("manifest-project.yaml"),
    });
    const shared = merged.skills.find(
      (s) => s.id === "claude-code:skills:shared",
    );
    expect((shared!.source as { path: string }).path).toBe("./shared-v2");
  });
});
