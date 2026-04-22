/** §2.1 중앙 Reserved Identifier Registry. Phase 1/2 공통 parse error. */

export interface SourceLoc {
  file: string;
  line: number;
  col: number;
}

export interface ReservedMatch {
  /** Reserved 를 감지한 패턴 이름 (에러 메시지용). */
  kind: string;
  /** 왜 reserved 인지 (Phase 2 기능 이름). */
  reason: string;
  /** Phase 2 에서 대체되는 경로. null 이면 대체 없음. */
  phase2Replacement: string | null;
}

export class ReservedIdentifierError extends Error {
  constructor(
    public readonly identifier: string,
    public readonly location: SourceLoc,
    public readonly match: ReservedMatch,
  ) {
    super(
      `${identifier} is reserved and not supported\n` +
        `  location: ${location.file}:${location.line}:${location.col}\n` +
        `  reason: ${identifier} is reserved for ${match.reason}.\n` +
        `  suggestion: ${
          match.phase2Replacement ??
          "not supported in Phase 1, see §12 Minority M5"
        }`,
    );
    this.name = "ReservedIdentifierError";
  }
}

/** Literal Reserved 필드명 (Q3 D4). */
const RESERVED_FIELD_NAMES: Record<string, ReservedMatch> = {
  include: {
    kind: "field",
    reason: "Phase 2 cross_sync: section",
    phase2Replacement: "cross_sync: (Phase 2 신규 섹션)",
  },
  exclude: {
    kind: "field",
    reason: "Phase 2 cross_sync: section",
    phase2Replacement: "cross_sync: (Phase 2 신규 섹션)",
  },
  allow_disassemble: {
    kind: "field",
    reason: "Phase 2 asset-level IR",
    phase2Replacement: null,
  },
  disassembled_sources: {
    kind: "field",
    reason: "Phase 2 asset-level IR",
    phase2Replacement: null,
  },
};

/** Regex 기반 Reserved 보간 문법 (E-6, E-11, E-12, E-15). */
const RESERVED_INTERPOLATION_PATTERNS: Array<{
  pattern: RegExp;
  match: ReservedMatch;
}> = [
  // E-6 Secret backends (prefix 매칭)
  {
    pattern: /\{secret:(1password|keychain|aws-ssm|azure-kv|gcp-sm):\/\/[^}]*\}/,
    match: {
      kind: "secret-backend",
      reason: "Phase 2 structured secret reference",
      phase2Replacement: "Phase 2 secretRef: structured field",
    },
  },
  // E-12 Type coercion — 첫 pipe 뒤가 int/bool/float 중 하나면 reserved (multi-pipe 포함)
  {
    pattern: /\{env:[^}|]+\|(int|bool|float)(?:\||\})/,
    match: {
      kind: "type-coercion",
      reason: "Phase 2 type coercion suffix",
      phase2Replacement: null,
    },
  },
  // E-15 Binary encoding
  {
    pattern: /\{file:[^}|]+\|base64\}/,
    match: {
      kind: "binary-encoding",
      reason: "Phase 2 binary encoding",
      phase2Replacement: null,
    },
  },
  // E-11 Default variants — {env:X-default} (콜론 없음, Docker Compose 변형)
  // 주의: {env:X:-default} 는 Phase 1 허용 (E-11), {env:X-default} 만 reserved
  {
    pattern: /\{env:[a-zA-Z_][a-zA-Z0-9_]*-[^:}]+\}/,
    match: {
      kind: "default-colonless",
      reason: "Phase 2 Docker Compose unset-only default variant",
      phase2Replacement: null,
    },
  },
  // E-11 {env:X:?error} strict error
  {
    pattern: /\{env:[^}:]+:\?[^}]+\}/,
    match: {
      kind: "default-strict-error",
      reason: "Phase 2 strict error message default",
      phase2Replacement: null,
    },
  },
];

/**
 * Manifest 파싱 전 호출. Reserved identifier 만나면 ReservedIdentifierError.
 * Unknown 필드는 passthrough (Π7, §2.4).
 */
export function checkReserved(identifier: string, location: SourceLoc): void {
  // 1) Literal field name
  if (identifier in RESERVED_FIELD_NAMES) {
    throw new ReservedIdentifierError(
      identifier,
      location,
      RESERVED_FIELD_NAMES[identifier]!,
    );
  }

  // 2) Interpolation patterns
  for (const { pattern, match } of RESERVED_INTERPOLATION_PATTERNS) {
    if (pattern.test(identifier)) {
      throw new ReservedIdentifierError(identifier, location, match);
    }
  }

  // 3) Generic unknown → passthrough (no-op)
}

/** 테스트 / debugging 용: 현재 등재된 Reserved 개수. */
export const RESERVED_FIELD_COUNT = Object.keys(RESERVED_FIELD_NAMES).length;
export const RESERVED_PATTERN_COUNT = RESERVED_INTERPOLATION_PATTERNS.length;
