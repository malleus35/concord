import { z } from "zod";
import { AssetType, Provider } from "./types.js";

/**
 * §5.6.2 ReasonEnum — capability_matrix 의 status 에 동반되는 사유 고정 집합.
 * Phase 1 은 additive only (Π5). 제거는 breaking.
 */
export const ReasonEnum = z.enum([
  // Install provenance (InstallReasonEnum subset)
  "UserExplicit",
  "Auto",
  "WindowsDefault",
  "NoPrivilege",
  "DevModeDisabled",
  "FsUnsupported",
  "CrossDevice",
  "CrossVolume",
  "PathLimit",
  "PathTooLong",
  "WSLFilesystem",

  // Provider / 실행 호환
  "CodexVersionTooOld",
  "WindowsUnsupported",
  "FeatureFlagDisabled",
  "ShellIncompatible",

  // 관측 실패 (status=failed 용)
  "PluginJsonMissing",
  "ParseFailed",
  "NetworkError",
  "MinEngineUnmet",

  // Error reporting only (E-4, lock 에 기록되지 않음, §8.5)
  "EnvVarMissing",

  // status=na 전용
  "ProviderNotInstalled",
  "AssetTypeNotApplicable",
]);
export type Reason = z.infer<typeof ReasonEnum>;

/** §5.6.2 InstallReasonEnum — install_mode 결정 provenance 전용 subset. */
export const InstallReasonEnum = z.enum([
  "UserExplicit",
  "Auto",
  "WindowsDefault",
  "NoPrivilege",
  "DevModeDisabled",
  "FsUnsupported",
  "CrossDevice",
  "CrossVolume",
  "PathLimit",
  "PathTooLong",
  "WSLFilesystem",
]);
export type InstallReason = z.infer<typeof InstallReasonEnum>;

/** §5.6.1 Q4 γ Hybrid — 4 status discriminated union.
 *  `.strict()` on every variant so illegal state (e.g. `supported + reason`)
 *  is rejected instead of silently stripped. */
export const CapabilityCellSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("supported"),
      count: z.number().int().min(0),
      install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
      install_reason: InstallReasonEnum.optional(),
      shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
      drift_status: z
        .enum(["none", "source", "target", "divergent", "env-drift"])
        .default("none"),
    })
    .strict(),
  z
    .object({
      status: z.literal("detected-not-executed"),
      count: z.number().int().min(0),
      detected: z.number().int().min(0),
      reason: ReasonEnum,
      install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
      install_reason: InstallReasonEnum.optional(),
      shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
      drift_status: z
        .enum(["none", "source", "target", "divergent", "env-drift"])
        .default("none"),
    })
    .strict(),
  z
    .object({
      status: z.literal("na"),
      reason: z.enum(["ProviderNotInstalled", "AssetTypeNotApplicable"]),
    })
    .strict(),
  z
    .object({
      status: z.literal("failed"),
      reason: ReasonEnum,
      error_detail: z.string().optional(),
    })
    .strict(),
]);
export type CapabilityCell = z.infer<typeof CapabilityCellSchema>;

/** Per-provider map. */
const ProviderMatrixSchema = z.record(AssetType, CapabilityCellSchema);

/** §5.6.1 top-level matrix: provider → assetType → cell. */
export const CapabilityMatrixSchema = z.record(Provider, ProviderMatrixSchema);
export type CapabilityMatrix = z.infer<typeof CapabilityMatrixSchema>;

/**
 * §5.6.3 20-line pure renderer.
 * supported → count / detected-not-executed → count* / na → - / failed → ?
 */
export function renderSymbol(cell: CapabilityCell): string {
  switch (cell.status) {
    case "supported":
      return String(cell.count);
    case "detected-not-executed":
      return `${cell.count}*`;
    case "na":
      return "-";
    case "failed":
      return "?";
  }
}
