import { describe, expect, it } from "vitest";
import { McpServerAssetSchema } from "../../../src/schema/assets/mcp-server.js";

describe("McpServerAssetSchema", () => {
  it("defaults transport=stdio", () => {
    const m = McpServerAssetSchema.parse({
      id: "claude-code:mcp_servers:airtable",
      source: { type: "external", description: "claude mcp add" },
      command: "npx",
      args: ["-y", "airtable-mcp-server"],
    });
    expect(m.transport).toBe("stdio");
  });

  it("accepts transport=http with url", () => {
    const m = McpServerAssetSchema.parse({
      id: "claude-code:mcp_servers:remote",
      source: { type: "external", description: "-" },
      transport: "http",
      url: "https://mcp.example.com",
    });
    expect(m.transport).toBe("http");
  });

  it("accepts env/headers records", () => {
    expect(
      McpServerAssetSchema.parse({
        id: "claude-code:mcp_servers:x",
        source: { type: "external", description: "-" },
        command: "mcp-server",
        env: { GITHUB_TOKEN: "{env:GITHUB_TOKEN}" },
        headers: { Authorization: "Bearer {env:API_KEY}" },
      }).env?.GITHUB_TOKEN,
    ).toBe("{env:GITHUB_TOKEN}");
  });

  it("rejects unknown transport", () => {
    expect(() =>
      McpServerAssetSchema.parse({
        id: "claude-code:mcp_servers:x",
        source: { type: "external", description: "-" },
        transport: "ipc",
      }),
    ).toThrow();
  });
});
