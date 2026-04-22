# POC Log — Plan 1 Results

## POC-3: YAML library selection

**결과**: `yaml` (eemeli) 2.x 채택 확정 (v2.8.3 기준).
**근거**: format-preserving API (CST), 활성 유지, 광범위한 TypeScript 지원.
**대안 비교 생략**: Plan 1 범위 밖. js-yaml 등은 format-preserving 미지원으로 초기 제외.

## Zod 3 → Zod 4 재평가 (spec 부록 B 동기화 완료 2026-04-22)

**spec 부록 B 원래 결정**: Zod 3 고정 (discriminatedUnion / passthrough deprecate 부담).
**본 plan 에서의 실제 선택**: **Zod 4.x** — 기존 `package.json` 의 deps 선택을 존중.
**영향**:
- `zod-to-json-schema` 의존 불필요 (Zod 4 native `z.toJSONSchema()` 사용)
- `.passthrough()` → `.loose()` 로 교체 (deprecation 대응)
- `z.string().url()` → `z.url()` / `z.string().datetime()` → `z.iso.datetime()` 교체
- `z.discriminatedUnion("field", [...])` 현재 유지 — 향후 `z.switch` 로 migration 예정
- Discriminated union 각 variant 에 `.strict()` 추가 (default strip 대응, illegal state rejection)

## POC-4: `~/.claude.json` format

**결과**: 순수 JSON 확정, `json-key-owned` 방식 채택 (2026-04-19).
**구현**: Plan 2 round-trip 단계에서 실제 적용. Plan 1 은 schema 수준까지만.

## POC-13: 4-scope merge order

**결과**: Golden test 통과 (`tests/integration/scope-merge.test.ts`).
**확인**: enterprise → user → project → local 순으로 적용, 같은 id 는 later scope 가 override.
**E-16 일관성**: merge 후 재보간 없음 (E-14 depth 1) 원칙 확인.

## POC-5 skeleton

**결과**: Plugin introspection 엔진은 Plan 3 에서 실제 구현.
**Plan 1 범위**: PluginAssetSchema + PluginSourceSchema 까지만 — 실제 `plugin.json` 파싱은 Plan 3.
