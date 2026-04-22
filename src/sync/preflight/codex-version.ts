import semver from "semver";
import { runCommand } from "../../utils/exec-file.js";

export interface CodexVersionCheck {
  installed: boolean;
  version: string | null;
  supportsWindowsHooks: boolean;
}

const MIN_WINDOWS_HOOKS = "0.119.0";

export async function checkCodexVersion(): Promise<CodexVersionCheck> {
  const r = await runCommand("codex", ["--version"]);
  if (r.errorCode === "ENOENT" || r.status !== 0) {
    return { installed: false, version: null, supportsWindowsHooks: false };
  }
  const match = r.stdout.match(/\b(\d+\.\d+\.\d+)\b/);
  if (!match) {
    return { installed: true, version: null, supportsWindowsHooks: false };
  }
  const version = match[1]!;
  const supportsWindowsHooks = semver.gte(version, MIN_WINDOWS_HOOKS);
  return { installed: true, version, supportsWindowsHooks };
}
