# POC-9 — symlink-dir macOS 실측 + Windows Gate

**Date**: 2026-04-22
**Plan**: Plan 2A
**Status**: **macOS CONFIRMED / Windows DEFERRED TO PLAN 2B CI**

## 문제 정의

concord 의 installer (Plan 2B Task: 자산 파일 설치) 는 **symlink 우선 / fallback 대응** 필요 (spec §9 D-1~D-11).
- macOS / Linux: symlink (기본)
- Windows (unprivileged): junction directory (Windows Vista+) 또는 hardlink file 로 자동 fallback
- Windows (Developer Mode) + WSL: symlink

`symlink-dir@10.0.1` 은 이 fallback 을 자동 수행한다고 문서화.
Plan 2A 는 **macOS 기본 경로 + atomic replace 경로** 실측, Windows 경로는 Plan 2B CI 에서.

## Wrapper 구현 참고사항 (Task 15 에서 해결된 이슈)

1. **`symlink-dir` export 형식**: default 가 아닌 **named export** `symlinkDir`. `import { symlinkDir } from "symlink-dir"` 사용.
2. **`is-wsl` export**: 모듈 로드 시 이미 호출된 boolean 상수.
3. **macOS `/var → /private/var` 심링크 문제**: `mkdtemp` 의 반환 경로가 실제로는 `/private/var/...` 로 resolve 됨. wrapper 에서 **parent 디렉토리만 realpath 정규화** + basename 결합으로 해결.

## 측정 결과 (macOS)

**실측값** (benchmark-9.json 참조):

| Scenario | Status | linkKind | elapsed (ms) |
|---|---|---|---|
| create-dir-symlink | pass | symlink | 0.59 |
| read-through-symlink | pass | — | 0.75 |
| symlink-2x-reused | pass | — | 0.43 |
| atomic-replace | pass | symlink | 1.44 |
| lstat-is-symbolic | pass | symlink | 0.23 |

Platform: `darwin`

## Windows Gate (Plan 2B 로 이관)

### Plan 2B CI Matrix 요구사항

- `windows-latest` GitHub Actions runner 에 `poc:9` 및 `tests/round-trip/symlink/` 전체 실행
- Developer Mode 비활성 / 활성 2 케이스 검증 — `is-elevated` 라이브러리로 분기
- `linkKind` 가 Windows 에서 `junction` (디렉토리) 또는 `hardlink` (파일) 로 결정되는지 확인
- WSL matrix (`wsl-ubuntu-22.04`) 추가 — `is-wsl` 라이브러리로 판별

### Antivirus / OneDrive 충돌 (spec §9 부록 B Known Issue 1, 2)

- Windows Defender 는 symlink 생성을 가끔 차단 → `preflight` 에서 AV exclusion 안내
- OneDrive 동기화 폴더 내 symlink 는 파괴적 — `preflight` 에서 warning
- 이 2 항목은 Plan 3 (`concord doctor`) 에서 실제 검사

## Plan 2B 에서의 적용 지침

1. **installer 는 `createDirSymlink` wrapper 를 사용**. 직접 `fs.symlink` 호출 금지. `symlink-dir` 의 자동 fallback 기능 활용
2. **atomic replace 패턴 준수** — staging dir 에서 만들고 rename 으로 이동 (`atomicReplaceSymlink` 사용)
3. **lock 의 `install_mode` / `install_reason` 필드** 에 `symlink` / `junction` / `hardlink` / `copy` 중 어느 것이 사용되었는지 기록 (spec §5.6 Q4 확장)
4. **drift 감지** 는 lock 의 `drift_status` 4 상태 (source/target/divergent/env-drift) 로 (spec §7.3.1)
5. **Windows fallback 발생 시 경고 없음** — fallback 은 정상 동작. 단, `doctor` 는 elevated 권한 유무 + Developer Mode 상태를 진단

## 재검토 트리거

- `symlink-dir` 메이저 업데이트 시 API 확인 (현재 v10.0.1)
- Windows CI 에서 junction 이 의도대로 동작하지 않으면 `fs-extra.ensureSymlink` 또는 수동 `fs.symlink` + exception 대응 로직으로 대체 검토
- macOS 16+ 에서 `sandbox` 로 symlink 제약 변경 시 재평가
