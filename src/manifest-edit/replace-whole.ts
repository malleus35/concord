import { readFile, writeFile, copyFile } from "node:fs/promises";

function utcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/** §6.6: copy target to .bak.<UTC>, then overwrite target with new content. */
export async function replaceWhole(targetPath: string, newContent: string): Promise<{ backupPath: string; bytesWritten: number }> {
  await readFile(targetPath); // existence check — throws ENOENT if missing
  const backupPath = `${targetPath}.bak.${utcStamp()}`;
  await copyFile(targetPath, backupPath);
  await writeFile(targetPath, newContent, "utf8");
  return { backupPath, bytesWritten: Buffer.byteLength(newContent, "utf8") };
}
