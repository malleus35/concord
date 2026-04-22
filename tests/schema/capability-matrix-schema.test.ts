import { describe, expect, it } from "vitest";
import {
  CapabilityCellSchema,
  CapabilityMatrixSchema,
  renderSymbol,
  type CapabilityCell,
} from "../../src/schema/capability-matrix.js";

describe("CapabilityCellSchema 4 status discriminated union", () => {
  it("accepts status=supported with count", () => {
    const cell = CapabilityCellSchema.parse({
      status: "supported",
      count: 3,
      shell_compatibility: "ok",
      drift_status: "none",
    });
    expect(cell.status).toBe("supported");
  });

  it("accepts status=detected-not-executed with reason", () => {
    const cell = CapabilityCellSchema.parse({
      status: "detected-not-executed",
      count: 0,
      detected: 2,
      reason: "CodexVersionTooOld",
      shell_compatibility: "incompatible",
    });
    expect(cell.status).toBe("detected-not-executed");
  });

  it("accepts status=na with ProviderNotInstalled", () => {
    const cell = CapabilityCellSchema.parse({
      status: "na",
      reason: "ProviderNotInstalled",
    });
    expect(cell.status).toBe("na");
  });

  it("accepts status=failed with reason", () => {
    const cell = CapabilityCellSchema.parse({
      status: "failed",
      reason: "PluginJsonMissing",
    });
    expect(cell.status).toBe("failed");
  });

  it("rejects illegal state (supported+reason) — discriminated union", () => {
    expect(() =>
      CapabilityCellSchema.parse({
        status: "supported",
        count: 1,
        reason: "CodexVersionTooOld", // supported 에 reason 금지
      }),
    ).toThrow();
  });
});

describe("renderSymbol (§5.6.3 20줄 pure function)", () => {
  it("supported → count as string", () => {
    const cell: CapabilityCell = {
      status: "supported",
      count: 5,
      shell_compatibility: "ok",
      drift_status: "none",
    };
    expect(renderSymbol(cell)).toBe("5");
  });

  it("detected-not-executed → count*", () => {
    const cell: CapabilityCell = {
      status: "detected-not-executed",
      count: 0,
      detected: 2,
      reason: "WindowsUnsupported",
      shell_compatibility: "incompatible",
      drift_status: "none",
    };
    expect(renderSymbol(cell)).toBe("0*");
  });

  it("na → -", () => {
    expect(
      renderSymbol({ status: "na", reason: "ProviderNotInstalled" }),
    ).toBe("-");
  });

  it("failed → ?", () => {
    expect(
      renderSymbol({ status: "failed", reason: "ParseFailed" }),
    ).toBe("?");
  });
});

describe("CapabilityMatrixSchema nested record<provider, record<asset, cell>>", () => {
  it("accepts full 3x6 matrix", () => {
    const matrix = CapabilityMatrixSchema.parse({
      "claude-code": {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "na", reason: "AssetTypeNotApplicable" },
        hooks: { status: "supported", count: 1, drift_status: "source" },
        mcp_servers: { status: "supported", count: 3, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "failed", reason: "PluginJsonMissing" },
      },
      codex: {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "supported", count: 1, drift_status: "none" },
        hooks: {
          status: "detected-not-executed",
          count: 0,
          detected: 1,
          reason: "CodexVersionTooOld",
          shell_compatibility: "incompatible",
          drift_status: "none",
        },
        mcp_servers: { status: "supported", count: 2, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "na", reason: "AssetTypeNotApplicable" },
      },
      opencode: {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "supported", count: 1, drift_status: "none" },
        hooks: { status: "na", reason: "AssetTypeNotApplicable" },
        mcp_servers: { status: "supported", count: 2, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "supported", count: 1, drift_status: "none" },
      },
    });
    expect(matrix["claude-code"]!.hooks.status).toBe("supported");
  });
});
