import { describe, expect, it } from "vitest";
import {
  SourceSchema,
  PluginSourceSchema,
} from "../../src/schema/source.js";

describe("SourceSchema — 6 types", () => {
  it("accepts git", () => {
    expect(
      SourceSchema.parse({
        type: "git",
        repo: "https://github.com/x/y",
        ref: "main",
      }).type,
    ).toBe("git");
  });

  it("accepts http + sha256", () => {
    expect(
      SourceSchema.parse({
        type: "http",
        url: "https://example.com/file.yaml",
        sha256: "a".repeat(64),
      }).type,
    ).toBe("http");
  });

  it("rejects http without sha256", () => {
    expect(() =>
      SourceSchema.parse({ type: "http", url: "https://x.com/y" }),
    ).toThrow();
  });

  it("rejects http sha256 with wrong length", () => {
    expect(() =>
      SourceSchema.parse({
        type: "http",
        url: "https://x.com/y",
        sha256: "short",
      }),
    ).toThrow();
  });

  it("accepts file / npm / external / adopted", () => {
    expect(SourceSchema.parse({ type: "file", path: "./x" }).type).toBe("file");
    expect(
      SourceSchema.parse({ type: "npm", package: "@x/y", version: "1.0.0" })
        .type,
    ).toBe("npm");
    expect(
      SourceSchema.parse({ type: "external", description: "installed via claude mcp add" })
        .type,
    ).toBe("external");
    expect(
      SourceSchema.parse({ type: "adopted", description: "scanned at 2026-04-22" })
        .type,
    ).toBe("adopted");
  });
});

describe("PluginSourceSchema — β3 α 3 types", () => {
  it("accepts claude-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "claude-plugin",
        marketplace: "anthropic",
        name: "github-integrator",
        version: "1.2.0",
      }).type,
    ).toBe("claude-plugin");
  });

  it("accepts codex-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "codex-plugin",
        marketplace: "openai-codex",
        name: "shell-utils",
        version: "0.3.1",
      }).type,
    ).toBe("codex-plugin");
  });

  it("accepts opencode-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "opencode-plugin",
        package: "@opencode-community/airtable",
        version: "2.0.0",
      }).type,
    ).toBe("opencode-plugin");
  });

  it("rejects unknown plugin type", () => {
    expect(() =>
      PluginSourceSchema.parse({ type: "unknown", name: "x", version: "1" }),
    ).toThrow();
  });
});
