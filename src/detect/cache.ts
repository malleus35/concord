import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import writeFileAtomic from "write-file-atomic";
import type { DetectCache } from "./types.js";

const CACHE_FILENAME = ".detect-cache.json";

/** §6.3: atomic write of agent probe results to `<concordHome>/.detect-cache.json`. */
export async function writeDetectCache(concordHome: string, cache: DetectCache): Promise<void> {
  await mkdir(concordHome, { recursive: true });
  await writeFileAtomic(join(concordHome, CACHE_FILENAME), JSON.stringify(cache, null, 2), "utf8");
}

/** §6.3: read cache; return null when file is missing (rethrow other I/O errors). */
export async function readDetectCache(concordHome: string): Promise<DetectCache | null> {
  try {
    const raw = await readFile(join(concordHome, CACHE_FILENAME), "utf8");
    return JSON.parse(raw) as DetectCache;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}
