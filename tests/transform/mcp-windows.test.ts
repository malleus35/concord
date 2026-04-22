import { describe, it, expect } from "vitest";
import { createMcpWindowsCommandTransformer } from "../../src/transform/mcp-windows.js";
import type { TransformContext } from "../../src/transform/types.js";

describe("mcp-windows-cmd-npx-wrap", () => {
  const transformer = createMcpWindowsCommandTransformer();

  it("name is mcp-windows-cmd-npx-wrap", () => {
    expect(transformer.name).toBe("mcp-windows-cmd-npx-wrap");
  });

  it("win32 + mcp_servers + command=npx → wraps with cmd /c npx", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const content = { command: "npx", args: ["-y", "@some/pkg"] };
    const { applied, result } = transformer.transform(content, ctx);
    expect(applied).toBe(true);
    const r = result as { command: string; args: unknown[] };
    expect(r.command).toBe("cmd");
    expect(r.args).toEqual(["/c", "npx", "-y", "@some/pkg"]);
  });

  it("darwin + mcp_servers + command=npx → no-op (platform gate)", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "darwin",
      assetType: "mcp_servers",
    };
    const content = { command: "npx", args: ["-y", "@some/pkg"] };
    const { applied, result } = transformer.transform(content, ctx);
    expect(applied).toBe(false);
    expect(result).toBe(content);
  });

  it("win32 + mcp_servers + command=node → no-op (command gate)", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const content = { command: "node", args: ["index.js"] };
    const { applied, result } = transformer.transform(content, ctx);
    expect(applied).toBe(false);
    expect(result).toBe(content);
  });

  it("win32 + skills + command=npx → no-op (assetType gate)", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "skills",
    };
    const content = { command: "npx", args: ["tool"] };
    const { applied, result } = transformer.transform(content, ctx);
    expect(applied).toBe(false);
    expect(result).toBe(content);
  });

  it("win32 + mcp_servers + non-object content → no-op", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const { applied, result } = transformer.transform("not-an-object", ctx);
    expect(applied).toBe(false);
    expect(result).toBe("not-an-object");
  });

  it("win32 + mcp_servers + null content → no-op", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const { applied, result } = transformer.transform(null, ctx);
    expect(applied).toBe(false);
    expect(result).toBeNull();
  });

  it("win32 + mcp_servers + command=npx + no args → wraps with empty origArgs", () => {
    const ctx: TransformContext = {
      provider: "claude-code",
      platform: "win32",
      assetType: "mcp_servers",
    };
    const content = { command: "npx" };
    const { applied, result } = transformer.transform(content, ctx);
    expect(applied).toBe(true);
    const r = result as { command: string; args: unknown[] };
    expect(r.command).toBe("cmd");
    expect(r.args).toEqual(["/c", "npx"]);
  });
});
