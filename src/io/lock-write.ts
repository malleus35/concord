import { default as writeAtomic } from "write-file-atomic";
import { copyFile, stat } from "node:fs/promises";

export async function writeLockAtomic(path: string, lock: unknown): Promise<void> {
  const existing = await stat(path).catch(() => null);
  if (existing?.isFile()) await copyFile(path, `${path}.bak`);
  const content = JSON.stringify(lock, null, 2) + "\n";
  await new Promise<void>((resolve, reject) => {
    (writeAtomic as any)(path, content, (err: Error | null | undefined) => {
      if (err) reject(err); else resolve();
    });
  });
}
