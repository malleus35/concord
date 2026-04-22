import { LockSchema, type Lock } from "./lock.js";

/** §5.12 validator + §5.10 I1/I5/I6 checks. */
export function validateLock(raw: unknown): Lock {
  if (
    raw === null ||
    typeof raw !== "object" ||
    (raw as { lockfile_version?: unknown }).lockfile_version !== 1
  ) {
    throw new Error(
      "lockfile_version must be 1 (Phase 1 fail-closed, §5.2)",
    );
  }

  const lock = LockSchema.parse(raw);

  checkNoSecretLeak(lock);
  // I6 Plugin intact 는 Zod passthrough 로 자동 보장됨 (declared 는 record<string, unknown>).

  return lock;
}

/**
 * §5.10 I5: Lock 에 resolved secret value 가 들어있지 않은지 heuristic check.
 * 완벽한 검증은 불가능 (임의 문자열 전부 검사 못 함).
 * 실전에서 흔한 토큰 prefix 만 탐지 (ghp_/xoxp_/sk-/AKIA 등).
 */
function checkNoSecretLeak(lock: Lock): void {
  const suspicious = /\b(ghp_|github_pat_|xoxp-|sk-[A-Za-z0-9]|AKIA[0-9A-Z])/;
  walkStrings(lock, (value) => {
    if (suspicious.test(value)) {
      throw new Error(
        `Lock contains suspected resolved secret value (I5 violation).\n` +
          `  hint: Lock must store unresolved {env:X} / {file:X} expressions only (E-3).`,
      );
    }
  });
}

function walkStrings(obj: unknown, fn: (s: string) => void): void {
  if (typeof obj === "string") {
    fn(obj);
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) walkStrings(item, fn);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) walkStrings(v, fn);
  }
}
