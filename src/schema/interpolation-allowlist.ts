import * as path from "node:path";
import * as os from "node:os";

export class InterpolationError extends Error {
  constructor(message: string, public readonly detail: string) {
    super(message);
    this.name = "InterpolationError";
  }
}

/**
 * "{env:X}" / "{file:X}" 를 포함하는가? "{{env:X}}" (이중 브레이스) 는 literal 로 간주 (E-13).
 */
export function containsInterpolation(value: string): boolean {
  // {{...}} literal 은 잠시 제거 후 판정
  const stripped = value.replace(/\{\{[^{}]*\}\}/g, "");
  return /\{(env|file):[^{}]+\}/.test(stripped);
}

/** §4.5 / E-7 allowlist. 허용 field path pattern. */
const ALLOWED_PATTERNS: RegExp[] = [
  /^source\.(url|repo|ref|version)$/,
  /^env\.[A-Z_][A-Z0-9_]*$/,
  /^authHeader$/,
  /^headers\.[\w-]+$/,
];

export function isAllowedField(fieldPath: string): boolean {
  return ALLOWED_PATTERNS.some((re) => re.test(fieldPath));
}

/** E-9 nested 보간 금지. `{env:TOKEN_${env:X}}` 같은 형태 감지. */
export function checkNested(value: string): void {
  // 보간 expression 내부에 또 다른 '{' 가 있으면 nested
  const matches = value.match(/\{(env|file):[^{}]*\{/);
  if (matches) {
    throw new InterpolationError(
      `nested interpolation not allowed (E-9)`,
      `expression: ${matches[0]}...`,
    );
  }
}

/** E-10 path traversal 방어. project root + 명시 허용 예외 (~/.config/concord/ / ~/.concord/). */
export function checkPathTraversal(
  filePath: string,
  projectRoot: string,
): void {
  const home = os.homedir();
  const allowedRoots = [
    path.resolve(projectRoot),
    path.join(home, ".config", "concord"),
    path.join(home, ".concord"),
  ];

  const expanded = filePath.startsWith("~")
    ? path.join(home, filePath.slice(2))
    : filePath;
  const resolved = path.resolve(projectRoot, expanded);

  const ok = allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
  if (!ok) {
    throw new InterpolationError(
      `path traversal detected`,
      `expression: {file:${filePath}} resolves to ${resolved} (outside allowed roots)`,
    );
  }
}
