import { z } from "zod";

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
