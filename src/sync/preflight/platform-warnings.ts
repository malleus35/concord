export interface PlatformWarningsInput {
  platform: NodeJS.Platform;
  installMode: "symlink" | "copy" | "hardlink" | "auto";
  targetPaths: readonly string[];
}

export interface PlatformWarnings {
  developerMode: { applicable: boolean; remediation?: string };
  avExclusion: { applicable: boolean; remediation?: string };
  oneDrive: { hasMatch: boolean; paths: string[] };
}

const ONEDRIVE_PATTERN = /\/OneDrive\//i;

export async function checkPlatformWarnings(input: PlatformWarningsInput): Promise<PlatformWarnings> {
  const isWin = input.platform === "win32";

  const developerMode = isWin && input.installMode === "symlink"
    ? { applicable: true, remediation: "Enable Developer Mode in Windows Settings, or use install: auto (recommended)." }
    : { applicable: false };

  const avExclusion = isWin
    ? { applicable: true, remediation: "Add your concord cache (~/.concord/cache) to Windows Defender exclusions to avoid slow writes." }
    : { applicable: false };

  const oneDrivePaths = input.targetPaths.filter((p) => ONEDRIVE_PATTERN.test(p));
  const oneDrive = { hasMatch: oneDrivePaths.length > 0, paths: oneDrivePaths };

  return { developerMode, avExclusion, oneDrive };
}
