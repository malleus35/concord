import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, lstat, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDirSymlink, atomicReplaceSymlink } from "../../../src/round-trip/symlink/symlink-dir.js";

const SAMPLE_SOURCE = join(__dirname, "../../fixtures/round-trip/symlink/sample-source");

describe("POC-9 symlink-dir — macOS/Linux basic", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    // macOS 에서 /var → /private/var symlink 문제를 피해 realpath 로 resolve.
    const base = await realpath(tmpdir());
    tmpRoot = await mkdtemp(join(base, "concord-poc9-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("createDirSymlink: target 이 source 를 가리킨다", async () => {
    const target = join(tmpRoot, "link");
    const result = await createDirSymlink(SAMPLE_SOURCE, target);
    expect(result.kind).toBeDefined();
    const stat = await lstat(target);
    // macOS/Linux 에선 symlink, Windows 에선 junction (또는 symlink if elevated)
    expect(stat.isSymbolicLink() || stat.isDirectory()).toBe(true);
  });

  it("createDirSymlink 뒤 read 로 source 내용 읽을 수 있다", async () => {
    const target = join(tmpRoot, "link");
    await createDirSymlink(SAMPLE_SOURCE, target);
    const content = await readFile(join(target, "a.md"), "utf8");
    expect(content).toContain("File A");
  });

  it("createDirSymlink 2회 (reused) — 이미 존재하는 link 는 재사용", async () => {
    const target = join(tmpRoot, "link");
    const r1 = await createDirSymlink(SAMPLE_SOURCE, target);
    const r2 = await createDirSymlink(SAMPLE_SOURCE, target);
    // symlink-dir 공식 API 는 reused: true 를 반환. 여기선 단순히 2회 호출이 에러 없이 끝나는지 확인.
    expect(r1.target).toBe(r2.target);
  });

  it("atomicReplaceSymlink: 기존 link 를 새 source 로 교체", async () => {
    const target = join(tmpRoot, "link");
    const staging = join(tmpRoot, ".staging-link");
    await createDirSymlink(SAMPLE_SOURCE, target);

    // 다른 source 디렉토리 생성
    const otherSource = join(tmpRoot, "other-source");
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(otherSource, { recursive: true });
    await writeFile(join(otherSource, "z.md"), "# File Z");

    const result = await atomicReplaceSymlink(otherSource, target, staging);
    expect(result.target).toBe(target);

    // target 이 이제 otherSource 를 가리킴
    const content = await readFile(join(target, "z.md"), "utf8");
    expect(content).toContain("File Z");
  });

  it("nested source 의 파일 접근 가능", async () => {
    const target = join(tmpRoot, "link");
    await createDirSymlink(SAMPLE_SOURCE, target);
    const content = await readFile(join(target, "nested", "c.md"), "utf8");
    expect(content).toContain("File C");
  });
});
