import { lstat, rm } from "node:fs/promises";

export interface UninstallResult {
  removed: boolean;
  kind?: "symlink" | "file" | "directory";
}

export async function uninstall(targetPath: string): Promise<UninstallResult> {
  let st;
  try { st = await lstat(targetPath); }
  catch { return { removed: false }; }
  const kind = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "directory" : "file";
  await rm(targetPath, { recursive: true, force: true });
  return { removed: true, kind };
}
