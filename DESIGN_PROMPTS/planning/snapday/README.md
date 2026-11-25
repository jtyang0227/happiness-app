# SNAPDAY 병합 문서

"SNAPDAY 통합 개발 지시서"(2026-11-25 사용자 전달)를 Happiness 앱 **모임(출사)** 기능에 병합한 작업의 문서 모음.
지시서는 프로젝트 루트에 문서를 만들라고 했지만, 이 저장소는 이미 루트 README·CLAUDE.md가 있고 기획 문서는 `DESIGN_PROMPTS/planning/`에 두는 규칙이라 여기에 모았다.

| 문서 | 내용 |
|---|---|
| `PROJECT_SPEC.html` | 전체 기획서(브라우저로 열기) — 결정 사항, 지시서 대비 기능표, 흐름, 화면, 규칙, 보안, 테스트 기준 |
| `DEVELOPMENT_PLAN.md` | 단계·순서·검증 방법 |
| `DATABASE_SCHEMA.md` | 지시서 표 ↔ 기존 표 대응, 신규 표 SQL |
| `API_SPEC.md` | 새 API 엔드포인트 |
| `TODO.md` | 진행 상황·미구현·외부 연동 대기 |

## 실행
로컬 전체: `apps/api/scripts/dev-env.sh up` (PG·Redis·Spring 8080·새 API 8090) → `cd apps/web && REACT_APP_API_URL=http://localhost:8090/api npm run dev`.
새 표는 Spring을 한 번 띄우면 Hibernate가 만든다(컷오버 전). 새 API는 `npm run build`(Prisma 클라이언트 생성) 후 재시작.

## 환경 변수(서버, 새 API)
| 변수 | 용도 | 없으면 |
|---|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI 출사 추천 | SAMPLE(개발용) 결과 — 화면에 배지 |
| `HOLIDAY_API_KEY` | 공공데이터포털 특일정보(공휴일 가져오기) | 가져오기 503 안내, 관리자 수동 등록으로 대체 |
| `BATCH_ENABLED` | 투표 자동 마감·마감 임박 알림 배치 | 꺼짐(Spring이 운영 중일 때 기본) |
