# 실행 프롬프트 — 앱 TypeScript 전환 마무리 → 어드민 이관 → Photoshop·Lightroom MCP (2026-11-24)

요청: "다 app 작업했으면 admin도 작업, 끝나면 포토샵·라이트룸 MCP 연결하는 작업도. 프롬프트 작성해서 바로 진행."
순서: **A(앱) → B(어드민) → C(Adobe MCP)**. 단, C는 앱·어드민 코드와 독립이고 작아서 먼저 끝내 둔다(순서가 바뀌어도 서로 막지 않음).
진행 기록은 `WORK_QUEUE.md`의 "TypeScript 전면 전환" 표(항목 1~12)에 남긴다. 기준 계획: `PLANNING_typescript-migration.md`.

---

## A. 앱 — `apps/api`로 나머지 API 옮기기 (큐 2~8, 10)

```
PLANNING_typescript-migration.md 의 다음 단계를 진행해줘. 큐에서 🔄 항목부터.

[규칙]
- Spring 동작을 1:1로 옮긴다 — 경로·상태 코드·응답 래퍼(ApiResponse / {status,data} / 래퍼 없음)·한국어 문구·null 키까지.
  원본 컨트롤러·서비스를 먼저 읽고 옮긴다. 버그를 발견해도 고치지 말고 README "알려진 차이"에 기록.
- 옮긴 경로는 Nest 라우트가 처리, 나머지는 자동으로 Spring 프록시(LEGACY_API_URL).
- 묶음마다 계약 테스트(test/contract/<묶음>.test.ts)를 추가해 Spring(8080)·Nest(8090) 둘 다 통과시킨다.
  기존 CoreFlowIntegrationTest 시나리오를 옮겨 온다.
- 스키마는 바꾸지 않는다(Prisma db pull만). 배포·DNS는 건드리지 않는다.
- 묶음 하나 = 커밋 하나, 큐에 ✅ + 해시.

[묶음]
2 인증·회원·계정 찾기 — 남은 것: member/{id}/profile·password·stats, members(관리자, 마스킹), members/search,
  member/{id}/role, find-email·password-reset 3개, OAuth 4개(외부 호출은 같은 URL·같은 파라미터).
3 사진·댓글·팔로우·피드·업로드(Supabase Storage)·신고·차단
4 시리즈·포트폴리오(블록 검증기 포함)·무드보드·탐색·비슷한 사진
5 문의(메일)·예약·납품·약속·분석
6 모임·스팟·장소 투표·알림·배치(@nestjs/schedule, 같은 cron)
7 추천사·언론·패키지·브랜드·뉴스레터·AI 어시스턴트 + 회원 탈퇴(전 모듈 연쇄 삭제) → Spring 경로 0개
8 웹 → TypeScript → Next.js (apps/web), 화면 390/1280 회귀 0
10 모바일 TypeScript (expo export web·android)

[검증] apps/api: npm run build + 계약 테스트 양쪽 통과 개수 보고. 웹·모바일은 기존 빌드 명령.
```

## B. 어드민 — happiness-admin → 이 저장소로 (큐 9)

```
happiness-admin(Spring Boot 3.5 + React CRA, 같은 DB 공유)을 TypeScript로 이 저장소에 합쳐줘.
- 서버: happiness-admin backend/의 /api/admin/** 와 /api/auth/login(관리자) 을 apps/api의 admin 모듈로 옮긴다.
  권한은 WM/SA(Authority) — 앱의 /api/admin/**(신고·큐레이션)과 경로가 겹치는지 먼저 대조하고 충돌 표를 남긴다.
  개인정보 보호 기준(마스킹·원문 열람 접속기록 security_audit_log, 30분 자동 로그아웃)은 그대로.
- 어드민 고유 테이블(portfolios·portfolio_items·photo_categories 등)은 Prisma db pull에 이미 있는지 확인, 없으면 기록만.
- 웹: happiness-admin frontend/ → apps/admin(Next.js, TypeScript). 디자인은 어드민 자체 시스템(Cosmos×Pinterest, CSS 변수) 유지.
- 계약 테스트: 어드민 서버(8081)와 Nest 양쪽.
- 끝나면 happiness-admin 저장소에는 "이 저장소로 이전됨" README만 남기는 것을 사용자에게 확인받는다(저장소 보관·삭제는 사용자 결정).
```

## C. Photoshop·Lightroom MCP 연결 (큐 12 — 완료)

```
Claude Code로 이 저장소를 작업할 때 Photoshop·Lightroom Classic을 조작할 수 있게 MCP를 연결해줘.
- .mcp.json(project scope)에 두 서버 추가, 버전 고정(공급망 위험 — 올릴 때는 변경 내역 확인 후):
  photoshop  npx -y @alisaitteke/photoshop-mcp@1.7.38   (MIT, macOS AppleScript / Windows COM, 비공식)
  lightroom  npx -y @mskalski/lightroom-mcp@0.27.0      (MIT, Lightroom Classic Lua 플러그인, 비공식)
- 두 앱은 사용자 PC에만 있으므로 클라우드 세션에서는 연결되지 않는다 → 로컬 Claude Code/Desktop 전용으로 안내.
- 자동 허용(allow)에 넣지 않는다 — 파일 저장·카탈로그 변경이 있어 매번 확인.
- 설정 방법·Happiness와 함께 쓰는 흐름은 docs/ADOBE_MCP.md.
```

### Happiness와 함께 쓰는 흐름(예)
1. Lightroom: "이번 주 별점 4 이상, 키워드 '웨딩' 사진 목록" → 보정 프리셋 적용 → JPEG 내보내기 폴더 지정.
2. Photoshop: 내보낸 사진 리사이즈·워터마크.
3. Happiness: 웹 "＋ 올리기"(에디터)로 업로드 → 작업(시리즈)으로 묶기. 업로드 자동화(MCP 쓰기 도구)는 하지 않는다 —
   `mcp-server/`는 읽기 전용 원칙(공개 GET만)이고, 쓰기 도구를 넣으려면 인증·권한 설계가 먼저 필요하다(별도 기획).
