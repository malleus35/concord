import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realpath } from "node:fs/promises";
import { createSymlinkInstaller } from "../../src/install/symlink.js";
import type { InstallRequest } from "../../src/install/types.js";

describe("SymlinkInstaller", () => {
  let tmpRoot: string;
  let sourceDir: string;

  beforeEach(async () => {
    const base = await realpath(tmpdir());
    tmpRoot = await mkdtemp(join(base, "concord-install-"));
    sourceDir = join(tmpRoot, "source");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "hello.txt"), "hello from source");
    await mkdir(join(sourceDir, "sub"), { recursive: true });
    await writeFile(join(sourceDir, "sub", "nested.txt"), "nested content");
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  const makeReq = (overrides: Partial<InstallRequest> = {}): InstallRequest => ({
    sourcePath: "",
    targetPath: "",
    kind: "directory",
    requestedMode: "auto",
    context: {
      assetType: "skills",
      provider: "claude-code",
      platform: process.platform as NodeJS.Platform,
    },
    ...overrides,
  });

  // Case 1: supports() — auto / symlink → true, copy → false
  describe("supports()", () => {
    it("auto 모드를 지원한다", () => {
      const installer = createSymlinkInstaller();
      expect(installer.supports(makeReq({ requestedMode: "auto" }))).toBe(true);
    });

    it("symlink 모드를 지원한다", () => {
      const installer = createSymlinkInstaller();
      expect(installer.supports(makeReq({ requestedMode: "symlink" }))).toBe(true);
    });

    it("copy 모드를 지원하지 않는다", () => {
      const installer = createSymlinkInstaller();
      expect(installer.supports(makeReq({ requestedMode: "copy" }))).toBe(false);
    });

    it("hardlink 모드를 지원하지 않는다", () => {
      const installer = createSymlinkInstaller();
      expect(installer.supports(makeReq({ requestedMode: "hardlink" }))).toBe(false);
    });
  });

  // Case 2: install directory symlink → target 에서 source 내용 접근 가능
  describe("install() — 디렉토리 심링크", () => {
    it("설치 후 target 경로를 통해 source 파일을 읽을 수 있다", async () => {
      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath }),
      );

      expect(result.targetPath).toBe(targetPath);
      expect(result.mode === "symlink" || result.mode === "junction").toBe(true);

      const content = await readFile(join(targetPath, "hello.txt"), "utf8");
      expect(content).toBe("hello from source");
    });

    it("nested 파일도 target 통해 접근 가능하다", async () => {
      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      await installer.install(makeReq({ sourcePath: sourceDir, targetPath }));

      const content = await readFile(join(targetPath, "sub", "nested.txt"), "utf8");
      expect(content).toBe("nested content");
    });

    it("InstallResult.reason 이 문자열을 반환한다", async () => {
      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath }),
      );

      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it("macOS/Linux 에서 target 이 심링크로 생성된다", async () => {
      if (process.platform === "win32") return;

      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath }),
      );

      expect(result.mode).toBe("symlink");
      expect(result.reason).toBe("SymlinkPreferred");

      const stat = await lstat(targetPath);
      expect(stat.isSymbolicLink()).toBe(true);
    });
  });

  // Case 3: 기존 target 이 있어도 atomic 교체된다
  describe("install() — 기존 target 교체", () => {
    it("기존 심링크가 있어도 새 source 로 교체된다", async () => {
      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      // 첫 번째 source 설치
      await installer.install(makeReq({ sourcePath: sourceDir, targetPath }));

      // 두 번째 source 생성
      const sourceDir2 = join(tmpRoot, "source2");
      await mkdir(sourceDir2, { recursive: true });
      await writeFile(join(sourceDir2, "other.txt"), "from source2");

      // 교체 설치
      const result = await installer.install(
        makeReq({ sourcePath: sourceDir2, targetPath }),
      );

      expect(result.targetPath).toBe(targetPath);

      // 새 source 내용 접근 확인
      const content = await readFile(join(targetPath, "other.txt"), "utf8");
      expect(content).toBe("from source2");
    });

    it("교체 후 이전 source 파일은 사라진다", async () => {
      const installer = createSymlinkInstaller();
      const targetPath = join(tmpRoot, "link");

      // 첫 번째 source 설치
      await installer.install(makeReq({ sourcePath: sourceDir, targetPath }));

      // 두 번째 source (hello.txt 없음)
      const sourceDir2 = join(tmpRoot, "source2");
      await mkdir(sourceDir2, { recursive: true });
      await writeFile(join(sourceDir2, "only-new.txt"), "new only");

      await installer.install(makeReq({ sourcePath: sourceDir2, targetPath }));

      // 이전 source 의 hello.txt 는 target 통해 더이상 접근 불가
      await expect(readFile(join(targetPath, "hello.txt"), "utf8")).rejects.toThrow();
    });
  });
});
