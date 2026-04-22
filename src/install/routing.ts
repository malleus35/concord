import type { InstallMode, InstallRequest } from "./types.js";

export function resolveInstallMode(req: InstallRequest): InstallMode {
  if (req.context.assetType === "skills" && req.context.provider === "claude-code") return "copy";
  if (req.context.platform === "win32") return "symlink";
  return "symlink";
}

export function effectiveMode(req: InstallRequest): InstallMode {
  if (req.requestedMode === "auto") return resolveInstallMode(req);
  return req.requestedMode;
}
