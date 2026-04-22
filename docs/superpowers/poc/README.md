# Concord — POC Decision Memos

각 POC 는 **실측 결과 + 라이브러리 선정 + 재검토 트리거** 를 기록한다.
Plan 2A (Round-trip POC sprint) 의 산출물이며, Plan 2B 이후의 의존 기반.

## 인덱스

| # | 주제 | 상태 | 문서 |
|---|---|---|---|
| POC-1 | TOML 3도구 벤치마크 | TBD | [poc-1-toml-library.md](2026-04-22-poc-1-toml-library.md) |
| POC-2 | JSONC 2도구 비교 | TBD | [poc-2-jsonc-library.md](2026-04-22-poc-2-jsonc-library.md) |
| POC-3 | YAML write-back | TBD | [poc-3-yaml-write-back.md](2026-04-22-poc-3-yaml-write-back.md) |
| POC-9 | symlink-dir 실측 | TBD | [poc-9-symlink.md](2026-04-22-poc-9-symlink.md) |

## 종합

- [Round-trip POC summary (4 POC 통합)](2026-04-22-round-trip-summary.md)

## 규약

- 파일명: `YYYY-MM-DD-poc-<N>-<slug>.md`
- 각 문서는 다음 섹션 포함:
  1. 문제 정의
  2. 후보 및 version
  3. 벤치마크 시나리오
  4. 결과 matrix
  5. **선정 결정 + 근거**
  6. 탈락 후보의 측정값 (기록용)
  7. 재검토 트리거
