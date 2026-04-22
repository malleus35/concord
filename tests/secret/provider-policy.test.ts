import { describe, it, expect } from "vitest";
import { shouldConcordInterpolate } from "../../src/secret/provider-policy.js";

describe("shouldConcordInterpolate (E-5)", () => {
  it("Claude mcp_servers → true", () => {
    expect(shouldConcordInterpolate("claude-code", "mcp_servers")).toBe(true);
  });

  it("Codex mcp_servers → true", () => {
    expect(shouldConcordInterpolate("codex", "mcp_servers")).toBe(true);
  });

  it("OpenCode mcp_servers → false (provider handles)", () => {
    expect(shouldConcordInterpolate("opencode", "mcp_servers")).toBe(false);
  });

  it("OpenCode skills → false (Π3 양보)", () => {
    expect(shouldConcordInterpolate("opencode", "skills")).toBe(false);
  });

  it("OpenCode plugins → false", () => {
    expect(shouldConcordInterpolate("opencode", "plugins")).toBe(false);
  });

  it("Claude skills → true", () => {
    expect(shouldConcordInterpolate("claude-code", "skills")).toBe(true);
  });
});
