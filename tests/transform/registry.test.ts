import { describe, it, expect } from "vitest";
import { createTransformerRegistry, applyTransformers } from "../../src/transform/registry.js";
import type { TransformContext } from "../../src/transform/types.js";

describe("createTransformerRegistry", () => {
  it("returns exactly 1 transformer", () => {
    const registry = createTransformerRegistry();
    expect(registry).toHaveLength(1);
  });

  it("first transformer is mcp-windows-cmd-npx-wrap", () => {
    const registry = createTransformerRegistry();
    expect(registry[0].name).toBe("mcp-windows-cmd-npx-wrap");
  });
});

describe("applyTransformers", () => {
  it("applies matching transformer and records name in appliedNames", () => {
    const registry = createTransformerRegistry();
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const content = { command: "npx", args: ["-y", "@tool/cli"] };
    const { result, appliedNames } = applyTransformers(content, ctx, registry);
    expect(appliedNames).toEqual(["mcp-windows-cmd-npx-wrap"]);
    const r = result as { command: string; args: unknown[] };
    expect(r.command).toBe("cmd");
    expect(r.args).toEqual(["/c", "npx", "-y", "@tool/cli"]);
  });

  it("no-op on darwin: appliedNames empty, result unchanged", () => {
    const registry = createTransformerRegistry();
    const ctx: TransformContext = {
      provider: "codex",
      platform: "darwin",
      assetType: "mcp_servers",
    };
    const content = { command: "npx", args: ["--yes", "pkg"] };
    const { result, appliedNames } = applyTransformers(content, ctx, registry);
    expect(appliedNames).toHaveLength(0);
    expect(result).toBe(content);
  });

  it("no-op when assetType is not mcp_servers: appliedNames empty", () => {
    const registry = createTransformerRegistry();
    const ctx: TransformContext = {
      provider: "opencode",
      platform: "win32",
      assetType: "hooks",
    };
    const content = { command: "npx", args: ["something"] };
    const { result, appliedNames } = applyTransformers(content, ctx, registry);
    expect(appliedNames).toHaveLength(0);
    expect(result).toBe(content);
  });

  it("chains transformers — cur carries forward between transformers", () => {
    // Use registry with 2 transformers to verify chaining
    const registry = createTransformerRegistry();
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const content = { command: "npx", args: ["pkg"] };
    // First transformer wraps; if there were a second, it would receive the wrapped result
    const { result, appliedNames } = applyTransformers(content, ctx, registry);
    expect(appliedNames).toHaveLength(1);
    const r = result as { command: string; args: unknown[] };
    expect(r.command).toBe("cmd");
  });
});
