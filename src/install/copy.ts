import { copy } from "fs-extra";
import type { Installer, InstallRequest, InstallResult } from "./types.js";

export function createCopyInstaller(): Installer {
  return {
    supports(req) { return req.requestedMode === "copy" || req.requestedMode === "auto"; },
    async install(req: InstallRequest): Promise<InstallResult> {
      await copy(req.sourcePath, req.targetPath, { overwrite: true, errorOnExist: false });
      return {
        mode: "copy",
        reason: req.requestedMode === "copy" ? "CopyRequested" : "CopyFallback",
        targetPath: req.targetPath,
      };
    },
  };
}
