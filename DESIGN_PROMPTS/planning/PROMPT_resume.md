# 재개 프롬프트 — 토큰 만료·세션 중단 후 이어서 작업하기

토큰(사용량 한도)이 바닥나거나 컨테이너가 회수돼 작업이 멈췄을 때, **새 세션이든 같은 세션이든 아래를 그대로 붙여 넣으면** 멈춘 지점부터 이어진다.
자동 재개 예약(`send_later`)도 이 문서를 가리킨다. 규칙의 근거는 CLAUDE.md "작업 이어하기 규칙".

---

## 붙여 넣을 프롬프트
```
WORK_QUEUE 이어서 진행해줘. DESIGN_PROMPTS/planning/PROMPT_resume.md 절차대로.
```

## 절차 (Claude가 따를 것)
1. **상태 읽기** — `DESIGN_PROMPTS/planning/PROJECT_MEMORY.md`(한 장 요약·환경) → `WORK_QUEUE.md` 맨 위 묶음.
2. **git 대조** — 저장소마다 `git status`·`git log --oneline -10`.
   - 작업 브랜치: `claude/wonderful-fermi-9uv8gf`(두 저장소 공통). 없으면 `git fetch origin <브랜치>` 후 체크아웃.
   - 큐와 git이 다르면 **git(실제 커밋)이 기준** — 큐를 고친다.
   - 커밋 안 된 변경이 있으면 이전 세션이 중간에 끊긴 것: 빌드가 되면 `wip:` 커밋으로 작업 브랜치에 저장하고 이어서, 깨져 있으면 원인을 보고 고친다(버리지 말 것).
3. **환경 준비** — `apps/api/scripts/dev-env.sh up > /tmp/happiness-dev/up.log 2>&1`
   (PostgreSQL 16 역할·DB, Redis, Spring 8080(같은 PG), Nest 8090을 멱등하게 띄움 — 첫 실행 2~4분, 파이프로 받지 말고 파일로).
   확인: `apps/api/scripts/dev-env.sh status`.
4. **재개 지점** — 큐의 🔄 항목(메모 칸의 "다음:"부터), 없으면 첫 ⏳. ⏸는 건너뛴다(사용자 결정 필요).
5. **한 항목 = 한 커밋** — 끝나면 검증(아래) → 큐에 ✅ + 해시 → CLAUDE.md·PROJECT_MEMORY 해당 줄 → 커밋·push.
   항목이 길면 중간 단계마다 큐 메모에 "마지막으로 한 일 / 다음 할 일"을 쓰고 `wip:` 커밋.
6. **다음 예약** — 남은 항목이 있으면 `send_later`로 약 5시간 뒤 "WORK_QUEUE 이어서 진행해줘. PROMPT_resume.md 절차대로."를 다시 건다
   (기존 예약이 있으면 `list_triggers`로 확인해 중복 금지). 모두 ✅면 예약하지 않는다.
7. **끝나면 서버 종료** — `apps/api/scripts/dev-env.sh down`.

## 검증 기준 (TypeScript 전환 묶음)
- `cd apps/api && npm run build`
- 계약 테스트 양쪽: `API_BASE_URL=http://localhost:8080 npm run test:contract`, `API_BASE_URL=http://localhost:8090 npm run test:contract`
  + 서버 간: `API_BASE_URL=http://localhost:8090 OTHER_API_BASE_URL=http://localhost:8080 npm run test:contract`
- Spring을 바꿨다면 `cd backend && ./gradlew test`, 웹/모바일은 CLAUDE.md 검증 명령.

## 하지 말 것
- 운영 배포·DNS·운영 DB 변경, master push, PR 생성 — 사용자 확인 없이 금지.
- 사용자가 채팅에 적은 적 있는 비밀번호 사용·저장.
- 큐에 없는 새 기능 시작.
