import { mkdtemp, rm, readFile, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createDirSymlink, atomicReplaceSymlink } from "../../src/round-trip/symlink/symlink-dir.js";

const SAMPLE_SOURCE = join(process.cwd(), "tests/fixtures/round-trip/symlink/sample-source");

type Result = {
  scenario: string;
  status: "pass" | "error";
  elapsedMs: number;
  errorMessage?: string;
  linkKind?: string;
};

async function runScenario(
  name: string,
  fn: (tmp: string) => Promise<string | undefined>,
): Promise<Result> {
  const tmp = await mkdtemp(join(tmpdir(), "concord-poc9-"));
  const t0 = performance.now();
  try {
    const linkKind = await fn(tmp);
    return { scenario: name, status: "pass", elapsedMs: performance.now() - t0, linkKind };
  } catch (err) {
    return {
      scenario: name,
      status: "error",
      elapsedMs: performance.now() - t0,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const results: Result[] = [];

  results.push(
    await runScenario("create-dir-symlink", async (tmp) => {
      const r = await createDirSymlink(SAMPLE_SOURCE, join(tmp, "link"));
      return r.kind;
    }),
  );

  results.push(
    await runScenario("read-through-symlink", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      await readFile(join(target, "a.md"), "utf8");
      return undefined;
    }),
  );

  results.push(
    await runScenario("symlink-2x-reused", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      await createDirSymlink(SAMPLE_SOURCE, target);
      return undefined;
    }),
  );

  results.push(
    await runScenario("atomic-replace", async (tmp) => {
      const target = join(tmp, "link");
      const staging = join(tmp, ".staging");
      await createDirSymlink(SAMPLE_SOURCE, target);
      // 다른 source 로 교체
      const { mkdir, writeFile } = await import("node:fs/promises");
      const other = join(tmp, "other");
      await mkdir(other, { recursive: true });
      await writeFile(join(other, "z.md"), "Z");
      const r = await atomicReplaceSymlink(other, target, staging);
      return r.kind;
    }),
  );

  results.push(
    await runScenario("lstat-is-symbolic", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      const st = await lstat(target);
      if (!st.isSymbolicLink() && !st.isDirectory()) {
        throw new Error("not a symlink or directory");
      }
      return st.isSymbolicLink() ? "symlink" : "junction-or-dir";
    }),
  );

  console.log(JSON.stringify({ platform: process.platform, results }, null, 2));
  console.table(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
