import { describe, expect, it } from "vitest";
import { validateManifest } from "../../src/schema/validate-manifest.js";
import { ReservedIdentifierError } from "../../src/schema/reserved-identifier-registry.js";
import { InterpolationError } from "../../src/schema/interpolation-allowlist.js";

describe("validateManifest 3-pass", () => {
  it("accepts valid minimal manifest", () => {
    const m = validateManifest({
      concord_version: ">=0.1",
      skills: [
        {
          id: "claude-code:skills:x",
          source: { type: "file", path: "./x" },
        },
      ],
    });
    expect(m.skills).toHaveLength(1);
  });

  it("fails at pre-validation when include: reserved", () => {
    expect(() =>
      validateManifest({ include: "something" }),
    ).toThrow(ReservedIdentifierError);
  });

  it("fails at pre-validation when {secret:...} reserved", () => {
    expect(() =>
      validateManifest({
        skills: [
          {
            id: "claude-code:skills:x",
            source: {
              type: "file",
              path: "./x",
            },
            env: { X: "{secret:1password://Work/GH/token}" },
          },
        ],
      }),
    ).toThrow(ReservedIdentifierError);
  });

  it("fails at pre-validation when interpolation in non-allowlist field (command)", () => {
    expect(() =>
      validateManifest({
        mcp_servers: [
          {
            id: "claude-code:mcp_servers:x",
            source: { type: "external", description: "-" },
            command: "{env:DANGEROUS}",
          },
        ],
      }),
    ).toThrow(InterpolationError);
  });

  it("fails at Zod parse when invalid schema", () => {
    expect(() =>
      validateManifest({
        skills: [{ id: "bad-no-colon", source: { type: "file", path: "./x" } }],
      }),
    ).toThrow();
  });

  it("fails at post-validation: claude-code + shared-agents (결정 A)", () => {
    expect(() =>
      validateManifest({
        skills: [
          {
            id: "claude-code:skills:x",
            source: { type: "file", path: "./x" },
            target: "shared-agents",
          },
        ],
      }),
    ).toThrow(/shared-agents.*claude-code/i);
  });

  it("fails at post-validation: case-insensitive collision (D-11)", () => {
    expect(() =>
      validateManifest({
        hooks: [
          {
            id: "claude-code:hooks:Hook",
            source: { type: "external", description: "-" },
            event: "X",
            registration: { command: "x", hook_type: "command" },
          },
          {
            id: "claude-code:hooks:hook",
            source: { type: "external", description: "-" },
            event: "X",
            registration: { command: "x", hook_type: "command" },
          },
        ],
      }),
    ).toThrow(/case-insensitive/i);
  });
});
