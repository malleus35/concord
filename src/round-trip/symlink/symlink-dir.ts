import { symlinkDir as _symlinkDir } from "symlink-dir";
import { rm, mkdir, realpath } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import isWsl from "is-wsl";

/**
 * Symlink creation 결과.
 */
export interface SymlinkResult {
  /** 생성된 링크의 유형. Windows 에서 fallback 가능. */
  kind: "symlink" | "junction" | "hardlink" | "copy";
  /** target 경로. */
  target: string;
  /** source 경로 (실제 디렉토리). */
  source: string;
  /** fallback 에 사용된 reason 열거 (없으면 null). */
  fallbackReason: string | null;
}

/**
 * 디렉토리 symlink 생성. macOS/Linux 기본 동작, Windows junction 자동 fallback.
 *
 * Plan 2A 는 macOS 경로만 검증. Windows 는 Plan 2B 에서 CI matrix 로 테스트.
 */
/**
 * target 경로를 macOS-safe 하게 resolve.
 * - parent 디렉토리만 realpath 로 정규화하고 basename 을 그대로 붙인다.
 * - 이렇게 하면 target 이 이미 symlink 인 경우에도 symlink 가 가리키는 곳을
 *   따라가지 않고 target 경로 자체를 유지한다.
 */
async function resolveTargetPath(p: string): Promise<string> {
  const parent = dirname(p);
  try {
    const resolvedParent = await realpath(parent);
    return join(resolvedParent, basename(p));
  } catch {
    // parent 도 존재하지 않으면 원본 경로 반환
    return p;
  }
}

export async function createDirSymlink(source: string, target: string): Promise<SymlinkResult> {
  // macOS 에서 /var → /private/var symlink 로 인한 relative path 계산 오류를 방지.
  const resolvedSource = await realpath(source);
  const resolvedTarget = await resolveTargetPath(target);
  await _symlinkDir(resolvedSource, resolvedTarget);
  // symlink-dir 의 결과는 `{ reused: boolean, warn?: string }` 형태.
  // kind 판정: Windows 가 아니면 symlink, WSL 도 symlink, Windows 이면 junction.
  const platform = process.platform;
  let kind: SymlinkResult["kind"] = "symlink";
  let fallbackReason: string | null = null;

  if (platform === "win32" && !isWsl) {
    kind = "junction";
    fallbackReason = "windows-junction-fallback";
  }

  return {
    kind,
    target: resolvedTarget,
    source: resolvedSource,
    fallbackReason,
  };
}

/**
 * Atomic staging — staging dir 에 먼저 만든 후 rename 으로 이동.
 * symlink 를 덮어쓰기 안전하게 교체.
 */
export async function atomicReplaceSymlink(
  source: string,
  target: string,
  staging: string,
): Promise<SymlinkResult> {
  // staging dir 의 parent 확보
  await mkdir(join(staging, ".."), { recursive: true }).catch(() => {});
  const stagingResult = await createDirSymlink(source, staging);

  // target 이 존재하면 제거
  try {
    await rm(target, { recursive: true, force: true });
  } catch {
    // ignore
  }

  // staging → target 으로 rename
  const { rename } = await import("node:fs/promises");
  await rename(staging, target);

  return { ...stagingResult, target };
}
