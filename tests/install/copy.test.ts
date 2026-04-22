import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realpath } from "node:fs/promises";
import { createCopyInstaller } from "../../src/install/copy.js";
import type { InstallRequest } from "../../src/install/types.js";

describe("CopyInstaller", () => {
  let tmpRoot: string;
  let sourceDir: string;

  beforeEach(async () => {
    const base = await realpath(tmpdir());
    tmpRoot = await mkdtemp(join(base, "concord-copy-"));
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
    requestedMode: "copy",
    context: {
      assetType: "skills",
      provider: "claude-code",
      platform: process.platform as NodeJS.Platform,
    },
    ...overrides,
  });

  // Case 1: supports()
  describe("supports()", () => {
    it("copy 모드를 지원한다", () => {
      const installer = createCopyInstaller();
      expect(installer.supports(makeReq({ requestedMode: "copy" }))).toBe(true);
    });

    it("auto 모드를 지원한다", () => {
      const installer = createCopyInstaller();
      expect(installer.supports(makeReq({ requestedMode: "auto" }))).toBe(true);
    });

    it("symlink 모드를 지원하지 않는다", () => {
      const installer = createCopyInstaller();
      expect(installer.supports(makeReq({ requestedMode: "symlink" }))).toBe(false);
    });

    it("hardlink 모드를 지원하지 않는다", () => {
      const installer = createCopyInstaller();
      expect(installer.supports(makeReq({ requestedMode: "hardlink" }))).toBe(false);
    });
  });

  // Case 2: 파일 복사
  describe("install() — 파일 복사", () => {
    it("source 파일을 target 경로로 복사한다", async () => {
      const installer = createCopyInstaller();
      const sourceFile = join(tmpRoot, "single.txt");
      const targetFile = join(tmpRoot, "target.txt");
      await writeFile(sourceFile, "file content here");

      const result = await installer.install(
        makeReq({ sourcePath: sourceFile, targetPath: targetFile, kind: "file" }),
      );

      expect(result.targetPath).toBe(targetFile);
      expect(result.mode).toBe("copy");
      const content = await readFile(targetFile, "utf8");
      expect(content).toBe("file content here");
    });
  });

  // Case 3: 디렉토리 재귀 복사
  describe("install() — 디렉토리 재귀 복사", () => {
    it("source 디렉토리를 target 디렉토리로 재귀 복사한다", async () => {
      const installer = createCopyInstaller();
      const targetPath = join(tmpRoot, "target-dir");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath }),
      );

      expect(result.targetPath).toBe(targetPath);
      expect(result.mode).toBe("copy");

      const content = await readFile(join(targetPath, "hello.txt"), "utf8");
      expect(content).toBe("hello from source");
    });

    it("nested 파일도 target 에 복사된다", async () => {
      const installer = createCopyInstaller();
      const targetPath = join(tmpRoot, "target-dir");

      await installer.install(makeReq({ sourcePath: sourceDir, targetPath }));

      const content = await readFile(join(targetPath, "sub", "nested.txt"), "utf8");
      expect(content).toBe("nested content");
    });
  });

  // Case 4: reason 문자열
  describe("install() — reason 문자열", () => {
    it("requestedMode=copy 이면 reason 이 CopyRequested 이다", async () => {
      const installer = createCopyInstaller();
      const targetPath = join(tmpRoot, "target-reason");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath, requestedMode: "copy" }),
      );

      expect(result.reason).toBe("CopyRequested");
    });

    it("requestedMode=auto 이면 reason 이 CopyFallback 이다", async () => {
      const installer = createCopyInstaller();
      const targetPath = join(tmpRoot, "target-auto");

      const result = await installer.install(
        makeReq({ sourcePath: sourceDir, targetPath, requestedMode: "auto" }),
      );

      expect(result.reason).toBe("CopyFallback");
    });
  });
});
