import { describe, expect, it } from "vitest";
import {
  ReasonEnum,
  InstallReasonEnum,
} from "../../src/schema/capability-matrix.js";

describe("ReasonEnum", () => {
  it("includes install reasons (§5.6.2)", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("UserExplicit");
    expect(values).toContain("WindowsDefault");
    expect(values).toContain("WSLFilesystem");
  });

  it("includes provider-compat reasons", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("CodexVersionTooOld");
    expect(values).toContain("WindowsUnsupported");
    expect(values).toContain("FeatureFlagDisabled");
    expect(values).toContain("ShellIncompatible");
  });

  it("includes observation-failure reasons", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("PluginJsonMissing");
    expect(values).toContain("ParseFailed");
    expect(values).toContain("NetworkError");
    expect(values).toContain("MinEngineUnmet");
  });

  it("includes EnvVarMissing (E-4, CLI output only)", () => {
    expect(ReasonEnum.options).toContain("EnvVarMissing");
  });

  it("includes status=na reasons", () => {
    expect(ReasonEnum.options).toContain("ProviderNotInstalled");
    expect(ReasonEnum.options).toContain("AssetTypeNotApplicable");
  });
});

describe("InstallReasonEnum ⊂ ReasonEnum (§5.6.2 관계)", () => {
  it("every InstallReasonEnum value is in ReasonEnum", () => {
    for (const v of InstallReasonEnum.options) {
      expect(ReasonEnum.options).toContain(v);
    }
  });

  it("install-provenance-only subset contains WindowsDefault", () => {
    expect(InstallReasonEnum.options).toContain("WindowsDefault");
  });

  it("does not include provider-compat reasons (out of scope)", () => {
    expect(InstallReasonEnum.options).not.toContain("CodexVersionTooOld");
    expect(InstallReasonEnum.options).not.toContain("FeatureFlagDisabled");
  });
});
