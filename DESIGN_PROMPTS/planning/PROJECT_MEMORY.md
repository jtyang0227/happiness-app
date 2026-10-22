# PROJECT MEMORY — Happiness 한 장 요약 (2026-10-22 기준)

> 새 세션은 이 문서를 먼저 읽고, 세부는 `CLAUDE.md`(약 2000줄)에서 해당 절만 찾아 본다.
> 클라우드 컨테이너는 매번 새로 만들어지므로 **저장소에 커밋된 문서만 다음 세션에 남는다** — 이 파일이 그 "메모리"다.
> 내용이 바뀌는 작업을 끝내면 이 파일의 해당 줄도 같이 고친다(길게 쓰지 말고 한 줄씩).

## 1. 제품
- **사진작가 포트폴리오 + 업무 앱.** "보여주기(포트폴리오·작업 노트) → 일 받기(문의·예약) → 일 처리하기(일정·약속·납품·수금)".
- 운영 주소: 웹 `https://happiness.io.kr`(Vercel), API `https://api.happiness.io.kr`(Railway). 별도 저장소 **happiness-admin**(운영자용)과 DB를 공유한다.
- 포트폴리오: 템플릿 4종 + **직접 구성(BLOCKS)** — 새 블록은 서버 `PortfolioLayoutValidator.BLOCK_PROPS` + 웹 `blocks/blockRegistry.js` 두 곳에 추가.
- 웹 메뉴 4개: **둘러보기**(`/explore`, 공개 — 사진|작업 탭) · **내 작업**(`/series`) · **업무**(`/workspace` 허브 + 문의·예약·일정·약속·납품 탭) · **모임**(`/gatherings`) + "＋ 올리기"(`/photo/new` = 이미지 에디터).
- 모바일(Expo) 탭: 탐색 · 갤러리(내 사진) · 등록 · 피드 · 프로필(나머지 기능은 프로필 메뉴에서 진입).

## 2. 스택·구조
| 영역 | 기술 | 위치 |
|---|---|---|
| 백엔드 | Spring Boot 3.4.5, Java 21 빌드, JPA+JPQL, feature 패키지 | `backend/src/main/java/com/happiness/app/<feature>/` |
| 웹 | React 18 CRA, React Router v6, **inline style만**, Context(Redux 없음) | `frontend/src/` |
| 모바일 | React Native 0.72 + **Expo SDK 49** | `mobile/` (실제 네비게이터는 `src/navigation/AppNavigator.js`) |
| DB | dev H2(create-drop) / prod Supabase PostgreSQL(**ddl-auto: update**, 풀러 때문에 `prepareThreshold: 0`) | |
| 기타 | Supabase Storage, Upstash Redis(장애 시 통과), Gemini 챗봇, 읽기 전용 MCP 서버(`mcp-server/`) | |

## 3. 검증 명령 (이것만 쓴다)
- 백엔드: `cd backend && ./gradlew clean build -x test` + `./gradlew test` → 결과는 `build/test-results/test/*.xml`의 `tests= failures=`로 확인 (현재 **52개** 통과: `CoreFlowIntegrationTest` 50 + `JwtTokenProviderTest` 2).
- 웹: `cd frontend && CI=true npm run build` → "Compiled successfully."
- 모바일: `cd mobile && npx expo export --platform web` → "Finished saving JS Bundles". 로그인 후 화면은 `--dev` 번들 + 로컬 bootRun으로 확인 가능(`secureStorage.web.js`).
- 로컬 서버 종료는 포트로: `fuser -k 8080/tcp 3000/tcp` (`pkill -f`는 내 셸까지 죽인다).
- 클라우드 세션은 egress 정책상 `*.happiness.io.kr`·`*.vercel.app`에 못 붙는다 → 운영 상태는 `gh api repos/jtyang0227/happiness-app/commits/<sha>/statuses`·`/deployments`로만 본다.

## 4. 작업 방식 (사용자 고정 규칙)
- 브랜치 `claude/photo-sorting-algorithm-mv383n`에서 작업 → push → `git push origin <branch>:master`(fast-forward, 강제 push 금지). PR은 요청 시에만.
- 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` + `Claude-Session:` 줄. 커밋·코드에 모델 ID 쓰지 않음.
- 여러 단계 작업은 `DESIGN_PROMPTS/planning/WORK_QUEUE.md`에 먼저 적고 항목마다 커밋. 새 세션은 큐 → `git log` 대조 → 재개.
- UI 작업은 `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 먼저, 기획은 `DESIGN_PROMPTS/planning/`. 메시지에 "기획"이 있으면 `/loop`.
- 끝나면 CLAUDE.md 반영 + 빌드/테스트 + 커밋·push, 보고는 한국어로 "변경 / 검증 / 주의" 순서.
- 사용자가 채팅에 비밀번호를 적은 적이 있다 — **저장·재사용 금지.**

## 5. 디자인 규칙
- **Toss 디자인 시스템**: 브랜드 컬러 `#3182F6` 하나, 배경 `#F2F4F6`, 카드 흰색, 플랫(블러·그라디언트·컬러 그림자 금지, 회색 그림자만). 토큰은 `constants/colors.js`(웹·모바일).
- 예외: 이미지 뷰어·에디터는 중립 다크(`#111417`/`#1A1E22`), 풀블리드 사진 위 컨트롤만 glass 허용(슬라이드쇼·PhotoViewer).
- 아이콘은 이모지/유니코드, 외부 UI 라이브러리 추가 금지. 공통 `Button`·`Input/FormField`, 스켈레톤 + 빈 상태 필수, WCAG AA(`successText` #007A45처럼 대비 맞춘 토큰).

## 6. 반복해서 터진 함정 (먼저 의심할 것)
1. **응답 래퍼가 컨트롤러마다 다르다** — 대부분 `ApiResponse{success,code,message,data}` → 프론트는 `res.data.data`, `/api/photos`·`PhotoController`는 `{status,data}`. 언래핑 실수로 "항상 비어 있음"이 여러 번 났다.
2. **4xx가 500으로 바뀜** — 예외 핸들러 누락. `GlobalExceptionHandler`가 `ResponseStatusException`·`IllegalArgumentException`을 처리하니 서비스에서는 이 둘을 던진다.
3. **요청의 `memberId`를 믿는 IDOR** — 쓰기 API는 `SecurityUtil.getCurrentMemberId()` 기준, 본인/관리자 확인(`isSelfOrAdmin`). 2026-10-22 점검으로 팔로우·피드·태그·공유·AI 태그·납품 승인까지 정리.
4. **존재하지 않는 API 경로 호출**, **Jackson `isXxx` 필드명**(`isActive` → JSON `active`), 정규화(소문자·trim) 전 비교, 프론트·서버 검증 규칙 불일치.
5. 웹 access token은 메모리에만 → 새로고침 직후 공개 GET에는 토큰이 없어 "…ByMe" 값이 항상 false(인증 경로로 따로 조회).
6. hover에 `transform`을 쓰는 카드에 등장 애니메이션을 같은 요소에 주면 hover가 죽는다 → wrapper/inner 분리.
7. **공개·인증 요청의 401을 토큰 만료로 처리하면** apiClient가 `logout()`→`/login` 새로고침을 돌려 오류 문구가 사라진다(틀린 비밀번호가 "아무 반응 없음"으로 보였던 원인). 인증 요청은 인터셉터 예외 목록에 둔다.
8. 모바일 네이티브 전용 모듈은 `*.web.js` 스텁으로 웹 번들에서 뺀다(metro 커스텀 리졸버는 동작 안 함). 서버 주소는 `mobile/constants/config.js` 한 곳.

## 7. 운영·배포 현황
- Vercel: GitHub 앱 연동으로 master push마다 Production — 정상.
- Railway: GitHub 앱 연동, `backend/` 변경 시에만 배포. **2026-10-20 13:49(256718e) 이후 배포가 멈춰 있음(⏸ 사용자 대시보드 확인 필요)** — 그 뒤 백엔드 수정(비슷한 사진, 보드 공유, 계정 찾기, 개인정보, 신고·차단, 보안 점검)은 운영 API에 미반영. 재배포 관례: `backend/railway.toml`의 `# redeploy-trigger-N` 숫자 올리기.
- GitHub Actions 배포 job은 시크릿이 없어 매번 건너뜀(실배포 0회) — CI 빌드·테스트 용도.
- 운영 DB 새 컬럼·테이블 SQL은 CLAUDE.md "운영 DB 수동 마이그레이션" 블록에 `IF NOT EXISTS`로 기록(ddl-auto update라 대개 자동 반영되지만 기록은 유지).

## 8. 사용자에게 남은 일 (코드로 못 하는 것)
- Railway: `JWT_SECRET` 설정 확인(없으면 재시작마다 로그인 풀림), 멈춘 배포 원인 확인 후 재배포, 메일(`MAIL_*`)·`FRONTEND_URL`.
- 앱 스토어: Expo SDK 49 → 최신 업그레이드(Play targetSdk 35·최신 Xcode), 심사용 데모 계정, 개인정보처리방침 공개 URL, App Privacy/데이터 안전 항목, `support@happiness.io.kr` 수신 확인.

## 9. 최근 큰 작업 (최신순, 자세한 건 커밋·문서)
| 날짜 | 커밋 | 내용 | 문서 |
|---|---|---|---|
| 10-22 | (이 커밋) | 모바일 웹 하단 탭 2차 — 다크 알약·활성 캡슐·프로필 사진·알약 밖 ＋ 원(Cosmos·Instagram 참고) | `design/DESIGN_PROMPT_bottom-nav-icons.md` |
| 10-22 | 2dc0f60 | 포트폴리오 "직접 구성" 블록 빌더(`/portfolio-builder`, 블록 12종, 서버 검증) | `planning/PLANNING_portfolio-blocks.md` |
| 10-22 | 8dfe427 | 보안 점검 8건(JWT 기본값, 납품 비밀번호, 팔로우·피드·태그·공유·AI 태그 IDOR) | `planning/SECURITY_AUDIT_2026-10-22.md` |
| 10-21 | 0131220 | 웹 화면 깨짐·위치 정리(390/1280 가로 넘침 0) | `design/DESIGN_PROMPT_web-layout-polish.md` |
| 10-21 | f389434 | 모바일 UI/UX 정리(흰 헤더·노치·대비·진입점) | `design/DESIGN_PROMPT_mobile-ux-polish.md` |
| 10-21 | cfc8689 | 앱 심사 대응(서버 주소, 탈퇴, 신고·차단, 권한, 아이콘) | `planning/PLANNING_app-store-review.md` |
| 10-21 | ff0277e·8cd7991 | 개인정보 보호(연락처 제거·마스킹·로그인 잠금), 메뉴명 "둘러보기" | `planning/PLANNING_privacy-protection-app.md` |
| 10-21 | c177cff | 아이디·비밀번호 찾기(웹·모바일·서버) | `planning/PLANNING_account-recovery.md` |
| 10-20 | — | 메뉴 4개 통합, 작업 노트·작업 탐색·감상·초안·크레딧·에디터 추천, 무드보드·공유, 비슷한 사진, 캐러셀 내보내기 | `planning/WORK_QUEUE.md`, `PLANNING_nav-consolidation.md` 등 |

## 10. 알려진 갭 (손대지 않은 것)
- 모바일 미구현: 보드 목록·공유, 크레딧 편집, 추천사 연결, 모임 생성·관리, 웹 "미수금" 탭, AI 챗봇. 웹에는 차단 UI 없음.
- rate limit·로그인 잠금이 전부 인메모리(인스턴스 여러 개면 따로 셈), access token은 비밀번호 변경 후에도 30분 유효.
- `SeriesController` 사진 목록에 작성자 정보 미첨부, 시리즈 커버 조회 N+1, 모임 피드 `likedByMe` 새로고침 문제, `AdminTagsPage`는 mock.
