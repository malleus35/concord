export type InstallMode = "symlink" | "copy" | "hardlink" | "junction";

export interface InstallRequest {
  sourcePath: string;
  targetPath: string;
  kind: "file" | "directory";
  requestedMode: InstallMode | "auto";
  context: {
    assetType: "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";
    provider: "claude-code" | "codex" | "opencode";
    platform: NodeJS.Platform;
  };
}

export interface InstallResult {
  mode: InstallMode | "copy";
  reason: string;
  targetPath: string;
}

export interface Installer {
  supports(req: InstallRequest): boolean;
  install(req: InstallRequest): Promise<InstallResult>;
}
