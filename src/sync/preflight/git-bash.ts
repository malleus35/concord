export interface GitBashCheck {
  applicable: boolean;
  found?: boolean;
  path?: string;
  remediation?: string;
}

export async function checkGitBash(): Promise<GitBashCheck> {
  if (process.platform !== "win32") return { applicable: false };
  const envPath = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  if (envPath && envPath.trim().length > 0) {
    return { applicable: true, found: true, path: envPath };
  }
  return {
    applicable: true,
    found: false,
    remediation:
      "Set CLAUDE_CODE_GIT_BASH_PATH to your Git Bash location (e.g. C:/Program Files/Git/bin/bash.exe).",
  };
}
