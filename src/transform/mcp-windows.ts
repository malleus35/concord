import type { FormatTransformer, TransformContext } from "./types.js";

export function createMcpWindowsCommandTransformer(): FormatTransformer {
  return {
    name: "mcp-windows-cmd-npx-wrap",
    transform(content, ctx: TransformContext) {
      if (ctx.platform !== "win32") return { applied: false, result: content };
      if (ctx.assetType !== "mcp_servers") return { applied: false, result: content };
      if (typeof content !== "object" || content === null) return { applied: false, result: content };
      const mcp = content as { command?: unknown; args?: unknown[] };
      if (mcp.command !== "npx") return { applied: false, result: content };
      const origArgs = Array.isArray(mcp.args) ? mcp.args : [];
      return { applied: true, result: { ...mcp, command: "cmd", args: ["/c", "npx", ...origArgs] } };
    },
  };
}
