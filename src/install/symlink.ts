import { atomicReplaceSymlink } from "../round-trip/symlink/symlink-dir.js";
import type { Installer, InstallRequest, InstallResult } from "./types.js";

export function createSymlinkInstaller(): Installer {
  return {
    supports(req) { return req.requestedMode === "symlink" || req.requestedMode === "auto"; },
    async install(req: InstallRequest): Promise<InstallResult> {
      const staging = `${req.targetPath}.concord-staging`;
      const res = await atomicReplaceSymlink(req.sourcePath, req.targetPath, staging);
      return {
        mode: res.kind === "junction" ? "junction" : "symlink",
        reason: res.kind === "junction" ? "WindowsJunctionFallback" : "SymlinkPreferred",
        targetPath: req.targetPath,
      };
    },
  };
}
