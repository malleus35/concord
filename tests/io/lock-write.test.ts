import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { writeLockAtomic } from "../../src/io/lock-write.js";

describe("writeLockAtomic", () => {
  it("new write: file created with correct JSON + trailing newline", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lock-write-"));
    const filePath = path.join(dir, "lock.json");
    const lock = { lockfile_version: 1, roots: ["a"], nodes: {} };

    await writeLockAtomic(filePath, lock);

    const raw = await fs.readFile(filePath, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(JSON.parse(raw)).toEqual(lock);
  });

  it("existing file → .bak backup contains previous content", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lock-write-"));
    const filePath = path.join(dir, "lock.json");
    const previous = { lockfile_version: 1, roots: ["old"], nodes: {} };
    await fs.writeFile(filePath, JSON.stringify(previous, null, 2) + "\n", "utf8");

    const updated = { lockfile_version: 2, roots: ["new"], nodes: {} };
    await writeLockAtomic(filePath, updated);

    const bakRaw = await fs.readFile(`${filePath}.bak`, "utf8");
    expect(JSON.parse(bakRaw)).toEqual(previous);

    const newRaw = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(newRaw)).toEqual(updated);
  });

  it("non-existing file → no .bak created", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lock-write-"));
    const filePath = path.join(dir, "lock.json");
    const lock = { lockfile_version: 1, roots: [], nodes: {} };

    await writeLockAtomic(filePath, lock);

    await expect(fs.access(`${filePath}.bak`)).rejects.toThrow();
  });
});
