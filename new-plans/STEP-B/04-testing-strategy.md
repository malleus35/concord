# B-5 — 테스트 전략

## 3층 테스트 피라미드

| 레이어 | 도구 | 범위 |
|---|---|---|
| 골든 파일 (필수) | vitest + fixtures | config 편집 bit-perfect 보존 검증 |
| Property-based | fast-check | 임의 config 입력에서 invariant 유지 |
| 통합 | tmp dir + fs mock | sync 의미론 (4상태 전이, drift, rollback) |

---

## 골든 파일 테스트 — **🔴 가장 중요**

### 패턴

각 시나리오마다 **3개 파일** 준비:
1. `input.json` (또는 `.toml`, `.jsonc`) — 원본 config 파일
2. `manifest.yaml` — 적용할 concord manifest
3. `expected.json` — 기대 출력

테스트:
```ts
it('preserves comments, order, and whitespace when adding MCP entry', async () => {
  const input = fs.readFileSync('fixtures/mcp-add/input.json', 'utf8');
  const manifest = parseManifest('fixtures/mcp-add/manifest.yaml');
  const expected = fs.readFileSync('fixtures/mcp-add/expected.json', 'utf8');

  const output = await applyManifest(input, manifest);

  expect(output).toBe(expected);                      // byte-level equality
  expect(output).not.toBe(input);                     // 변경 일어났음 확인
  assertPreservationInvariants(input, output, manifest);
});
```

### Invariant 검증 함수 (v2 — 리뷰 반영)

```ts
function assertPreservationInvariants(original: string, modified: string, manifest: Manifest) {
  // 1. 변경 범위 밖의 주석이 모두 보존됨 (단조 부등식 아님 — 교집합 검사)
  const outsideOrig = extractRegionOutsideManaged(original, manifest);
  const outsideMod = extractRegionOutsideManaged(modified, manifest);
  expect(outsideMod).toBe(outsideOrig);                                // byte-level 일치

  // 2. 변경 범위 밖의 키·값이 그대로임 (structural)
  const outsideChanges = diffOutsideManagedRegions(original, modified, manifest);
  expect(outsideChanges).toHaveLength(0);

  // 3. 변경 범위 밖의 trailing comma 수 동일 (삭제 연산에서도 정확)
  const outsideCommasOrig = countTrailingCommasInRegion(original, outsideOrig);
  const outsideCommasMod = countTrailingCommasInRegion(modified, outsideMod);
  expect(outsideCommasMod).toBe(outsideCommasOrig);                    // 단조증가 X, 동일 ==

  // 4. 개행 스타일 유지 (LF/CRLF)
  expect(detectEOL(modified)).toBe(detectEOL(original));

  // 5. BOM 유지
  expect(hasBOM(modified)).toBe(hasBOM(original));

  // 6. Marker 무결성 (marker ID + hash suffix 검증)
  if (hasMarkers(modified)) {
    expect(verifyMarkerIntegrity(modified)).toBe(true);
  }
}
```

**v1 → v2 차이**: `countTrailingCommas >= original` 을 **범위 외 영역에서 `===` 동일** 로 교정. 삭제 연산에서 comma 가 정당하게 줄어드는 케이스를 false negative 로 통과시키던 결함 수정.

### 필수 골든 시나리오 (v2 — 리뷰 반영)

| 시나리오 | 포맷 | 검증 |
|---|---|---|
| empty file에 첫 entry 추가 | JSON/JSONC/TOML | 3개 포맷 × install |
| 기존 entry가 있는 파일에 새 entry 추가 | JSON/JSONC/TOML | 주석 보존 |
| 주석이 entry 사이에 있는 파일 편집 | JSONC/TOML | 주석 유실 없음 |
| trailing comma가 있는 JSONC 편집 | JSONC | comma 유지 |
| entry 수정 (update) | JSON/JSONC/TOML | 인접 entry 변경 없음 |
| entry 삭제 (prune) | JSON/JSONC/TOML | 인접 주석 연결 보존, 범위 외 comma 수 **정확히 동일** |
| marker 블록 교체 | JSONC/TOML | 블록 외부 무변경 |
| CRLF 파일 편집 (Windows) | 모두 | EOL 유지 |
| UTF-8 BOM 파일 편집 | 모두 | BOM 유지 |
| 깊이 중첩된 객체/테이블 | 모두 | 구조 보존 |
| **marker 손상 (comment 삭제)** — v2 추가 | JSONC/TOML | `--repair` 시 마커 재삽입, 미포함 시 block |
| **marker ID 중복** (동일 ID 2개) — v2 추가 | JSONC/TOML | 에러 처리 + 명확한 사용자 메시지 |
| **invalid-but-recoverable 입력** — v2 추가 | 모두 | 예: 누락된 `}`, mismatched quote — 사용자에게 line 위치 정확히 제시 |
| **precedence collision** — v2 추가 | 모두 | 동일 id 가 user + project scope 충돌 — `scope-conflict` 상태 정확히 감지 |
| **formatter 실행 후 재sync** — v2 추가 | JSONC/TOML | prettier/biome 실행 후 raw_hash 변경, normalized_hash 동일 → SILENT_UPDATE 동작 |
| **array-of-tables (TOML)** — v2 추가 | TOML | 순서·구조 보존 |
| **inline table (TOML)** — v2 추가 | TOML | standard table 로 변환되지 않음 확인 |
| **multi-line array (TOML)** — v2 추가 | TOML | 개행·들여쓰기 유지 |

---

## Property-based 테스트

`fast-check` 로 임의 JSON/JSONC/TOML 생성 → concord 편집 → invariant 검증.

```ts
test.prop([arbitraryJsonc(), arbitraryManifest()])(
  'applyManifest preserves comments and order outside managed regions',
  (input, manifest) => {
    const output = applyManifest(input, manifest);
    assertPreservationInvariants(input, output, manifest);
  }
);
```

### 주요 property들

1. **Idempotency**: `apply(apply(x, m), m) === apply(x, m)` — 같은 manifest 두 번 적용해도 동일
2. **Commutativity (limited)**: 서로 다른 key 경로의 변경은 순서 무관
3. **Roundtrip**: `serialize(parse(x)) === x` (변경 없는 경우)
4. **Reversibility**: `apply(x, m)` 후 `apply(result, invert(m)) === x`

---

## 통합 테스트 — Sync 의미론

```ts
describe('concord sync state machine', () => {
  it('INSTALL: manifest entry → new target created + lock updated', async () => {
    const tmp = await createTempProject({ manifest: MANIFEST_WITH_ONE_SKILL });
    await runSync(tmp);
    expect(fs.existsSync(`${tmp}/.claude/skills/my-skill`)).toBe(true);
    expect(readLock(tmp).entries).toHaveLength(1);
  });

  it('DRIFT: user edits target → sync blocks', async () => {
    const tmp = await setupSyncedProject();
    await fs.appendFile(`${tmp}/.claude/skills/my-skill/SKILL.md`, 'user edit');
    const result = await runSync(tmp, { expectFail: true });
    expect(result.error).toMatch(/drift detected/i);
  });

  it('DRIFT --preserve: user edits kept, entry skipped', async () => {...});
  it('DRIFT --force: user edits overwritten, backup created', async () => {...});
  it('PRUNE: manifest entry removed → target removed', async () => {...});
  it('UPDATE: source hash changed → re-fetched', async () => {...});
  it('ROLLBACK: previous sync undone', async () => {...});
  it('ATOMIC: mid-sync failure → no partial state', async () => {...});
});
```

---

## Fuzzing (선택)

`@ltd/j-toml` 과 `jsonc-parser` 의 엣지 케이스 커버:

- 길이 1MB 이상 config 파일
- 유니코드·이모지 포함 키
- 심각한 중첩 (깊이 100+)
- 잘못된 입력에 대한 graceful 처리

실행 빈도: CI nightly, 별도 job.

---

## CI 구성

| Job | 트리거 | 실행 |
|---|---|---|
| unit + golden | PR | vitest (fast, <30s) |
| property | PR | fast-check (mid, ~2min) |
| integration | PR | tmp dir 기반 sync test (~5min) |
| fuzz | nightly | 장시간 fuzzing |
| golden drift | weekly | 실제 Claude/Codex/OpenCode 바이너리로 편집 후 load test |

---

## 성공 기준

- 모든 golden test byte-level equality 통과 → PR merge 가능 조건
- Property test 1000 샘플 이상에서 실패 0
- Integration test 커버리지: sync 상태 머신 전 경로 + drift 시나리오 매트릭스
- Fuzzing: 주간 8시간 실행에서 crash 0
