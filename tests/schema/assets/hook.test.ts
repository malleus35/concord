import { describe, expect, it } from "vitest";
import { HookAssetSchema } from "../../../src/schema/assets/hook.js";

describe("HookAssetSchema", () => {
  it("accepts registration-only (no implementation)", () => {
    const h = HookAssetSchema.parse({
      id: "claude-code:hooks:pre-commit",
      source: { type: "external", description: "defined in settings.json" },
      event: "PreCommit",
      registration: {
        matcher: "*.ts",
        command: "prettier --write",
        hook_type: "command",
      },
    });
    expect(h.event).toBe("PreCommit");
  });

  it("accepts implementation-only (no registration)", () => {
    expect(
      HookAssetSchema.parse({
        id: "codex:hooks:on-start",
        source: { type: "file", path: "./hooks/on-start.sh" },
        event: "OnStart",
        implementation: {
          source: { type: "file", path: "./hooks/on-start.sh" },
          target_path: "hooks/on-start.sh",
        },
      }).event,
    ).toBe("OnStart");
  });

  it("rejects when both registration and implementation missing", () => {
    expect(() =>
      HookAssetSchema.parse({
        id: "claude-code:hooks:x",
        source: { type: "file", path: "./x" },
        event: "X",
      }),
    ).toThrow(/registration or implementation/);
  });

  it("accepts hook_type ∈ {command, http, prompt, agent}", () => {
    for (const t of ["command", "http", "prompt", "agent"] as const) {
      const h = HookAssetSchema.parse({
        id: "claude-code:hooks:x",
        source: { type: "external", description: "-" },
        event: "X",
        registration: { command: "x", hook_type: t },
      });
      expect(h.registration?.hook_type).toBe(t);
    }
  });
});
