---
name: verify
description: 이 저장소에서 작업을 끝냈을 때 바뀐 영역(백엔드·TS API·어드민 웹·웹·모바일)만 골라 빌드·타입·테스트·보안 grep·diff 점검을 돌리고 PASS/FAIL 검증 보고서를 만든다. 커밋·push 전, 기능 구현 후, "/verify" 요청 시 사용.
license: MIT
metadata:
  origin: ECC (affaan-m/ECC skills/verification-loop, MIT) — Happiness 명령으로 다시 씀
---

# Verify — 6단계 검증 루프

CLAUDE.md "기획 자동 Loop" 5단계의 `/verify`가 이 스킬이다. **저장소에 실제로 있는 명령만** 쓴다.
실패하면 멈추고 원인을 고친 뒤 실패한 단계만 다시 돌린다(전체 재실행은 실패가 많을 때만).

## 0. 범위 정하기

```bash
git status --porcelain
git diff --name-only HEAD; git diff --name-only --cached
```
바뀐 경로로 아래 단계 중 해당하는 것만 돈다. `.claude/`·문서만 바뀌었으면 1~4단계는 "해당 없음".

## 1. 빌드

| 바뀐 경로 | 명령 | 통과 기준 |
|---|---|---|
| `backend/` | `cd backend && ./gradlew clean build -x test` | BUILD SUCCESSFUL |
| `apps/api/` | `cd apps/api && npm run build` | 종료 코드 0 |
| `apps/admin/` | `cd apps/admin && npm run build` | 종료 코드 0 |
| `frontend/` | `cd frontend && CI=true npm run build` | "Compiled successfully." (경고 0) |
| `mobile/` | `cd mobile && npx expo export --platform web` | "Finished saving JS Bundles" |

출력은 `2>&1 | tail -30`으로 줄이되 `set -o pipefail`로 실제 종료 코드를 본다.

## 2. 타입

- `apps/admin`: `npm run typecheck`
- `mobile`: `npm run typecheck`
- `apps/api`·`apps/web`: 빌드에 포함

## 3. 테스트

- 백엔드: `cd backend && ./gradlew test` → `build/test-results/test/*.xml`의 `tests=`·`failures=` 합계를 적는다.
- 어드민 웹: `cd apps/admin && npm test`
- TS API 계약 테스트: 로컬 환경(`apps/api/scripts/dev-env.sh up > /tmp/happiness-dev/up.log 2>&1`)이 있을 때만
  `API_BASE_URL=http://localhost:8090 npm run test:contract`. 못 돌리면 "미실행 — 이유"로 적는다.
- 버그 수정이면 그 원인을 다시 잡는 테스트를 같이 넣었는지 확인(백엔드는 `CoreFlowIntegrationTest`).

## 4. 화면 (UI를 바꿨을 때)

로컬 서버를 띄우고 Playwright로 390px·1280px 스크린샷 + 가로 넘침(`scrollWidth > innerWidth`) + 콘솔 에러 0 확인.
서버 종료는 `fuser -k <port>/tcp` (`pkill -f` 금지).

## 5. 보안 grep (바뀐 파일만)

```bash
FILES=$(git diff --name-only HEAD; git diff --name-only --cached)
echo "$FILES" | xargs -r grep -nE "(ghp_|github_pat_|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)" 2>/dev/null
echo "$FILES" | grep -E "\.(jsx?|tsx?)$" | xargs -r grep -n "console\.log" 2>/dev/null
echo "$FILES" | grep -E "(^|/)\.env(\.local)?$"
```
- 쓰기 API를 바꿨으면 요청의 `memberId`를 믿지 않는지(`SecurityUtil.getCurrentMemberId()`·`isSelfOrAdmin`) 확인.
- 새 예외는 `ResponseStatusException`/`IllegalArgumentException`으로(500으로 바뀌지 않게).

## 6. diff 점검

`git diff --stat` 후 파일마다: 요청과 무관한 변경, 디버그 코드, 쓰이지 않게 된 import, 응답 래퍼 언래핑(`res.data.data` vs `{status,data}`).

## 운영 확인은 따로

로컬 통과 ≠ 운영 반영. push 뒤 `gh api repos/jtyang0227/happiness-app/commits/<sha>/statuses`로 Vercel·Railway 기록을 보고,
확인 못 했으면 "운영 미확인"으로 적는다. 운영 DB·배포 설정은 사용자 허락 없이 건드리지 않는다.

## 보고 형식 (한국어, "변경 / 검증 / 주의"의 검증 칸에 넣는다)

```
검증
- 빌드: 백엔드 PASS · 웹 PASS("Compiled successfully.") · 모바일 해당 없음
- 타입: 어드민 PASS
- 테스트: 백엔드 62/62 · 계약 테스트 미실행(로컬 PG 없음)
- 화면: 390/1280 가로 넘침 0, 콘솔 에러 0
- 보안 grep: 0건
- diff: 4개 파일, 무관한 변경 없음
- 운영: 미확인(push 후 상태 기록 대기)
종합: 커밋 가능 / 불가(이유)
```
