import { describe, expect, it } from "vitest";
import { PluginAssetSchema } from "../../../src/schema/assets/plugin.js";

const CLAUDE_PLUGIN = {
  id: "claude-code:plugins:github-integrator",
  source: {
    type: "claude-plugin",
    marketplace: "anthropic",
    name: "github-integrator",
    version: "1.2.0",
  },
};

describe("PluginAssetSchema", () => {
  it("accepts minimal claude-plugin with flag defaults", () => {
    const p = PluginAssetSchema.parse(CLAUDE_PLUGIN);
    expect(p.auto_install).toBe(true);
    expect(p.enabled).toBe(true);
    expect(p.purge_on_remove).toBe(false);
  });

  it("accepts codex-plugin + dependencies + min_engine", () => {
    const p = PluginAssetSchema.parse({
      id: "codex:plugins:shell",
      source: {
        type: "codex-plugin",
        marketplace: "openai-codex",
        name: "shell",
        version: "0.3.1",
      },
      dependencies: ["claude-code:plugins:utils"],
      min_engine: "0.119.0",
    });
    expect(p.dependencies).toEqual(["claude-code:plugins:utils"]);
    expect(p.min_engine).toBe("0.119.0");
  });

  it("accepts opencode-plugin with package ref", () => {
    const p = PluginAssetSchema.parse({
      id: "opencode:plugins:airtable",
      source: {
        type: "opencode-plugin",
        package: "@opencode-community/airtable",
        version: "2.0.0",
      },
      enabled: false,
      purge_on_remove: true,
    });
    expect(p.enabled).toBe(false);
    expect(p.purge_on_remove).toBe(true);
  });

  it("rejects non-plugin source types (e.g. git)", () => {
    expect(() =>
      PluginAssetSchema.parse({
        id: "claude-code:plugins:x",
        source: { type: "git", repo: "https://x", ref: "main" },
      }),
    ).toThrow();
  });
});
