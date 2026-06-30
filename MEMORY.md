# MEMORY.md — Happiness 프로젝트 핵심 요약

> CLAUDE.md 전체 내용의 빠른 참조용 요약. 상세 내용은 CLAUDE.md 참조.  
> 마지막 업데이트: 2026-06-27

---

## 1. 프로젝트 한 줄 요약

**사진작가 포트폴리오 앱** — Spring Boot 백엔드 + React 프론트엔드 + React Native 모바일

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | Spring Boot 3.4.5 / Java 25 / Gradle 9.5 / JPA + JPQL |
| Frontend | React 18 SPA / React Router v6 / inline style (CSS-in-JS 없음) |
| Mobile | React Native 0.72 / Expo 49 |
| DB (운영) | Supabase PostgreSQL (500MB 무료) |
| Storage | Supabase Storage (1GB 무료) |
| Cache | Upstash Redis (10K cmd/일 무료) |
| 배포 | Frontend → Vercel / Backend → Railway ($5/월) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

---

## 3. 로컬 실행 명령어

```bash
# 백엔드 (포트 8080)
cd backend && ./gradlew bootRun

# 프론트엔드 (포트 3000)
cd frontend && npm start

# 모바일
cd mobile && npm start

# 도커 (백엔드 + Redis)
docker-compose up --build
```

**빌드 검증 (커밋 전 필수):**
```bash
cd backend && ./gradlew test --no-daemon          # BUILD SUCCESSFUL
cd frontend && npm run build                       # Compiled successfully.
cd frontend && npm test -- --watchAll=false --passWithNoTests
```

---

## 4. 절대 금지 규칙

| 항목 | 금지 이유 |
|------|----------|
| `ddl-auto: create/create-drop` | 운영 DB 데이터 삭제 위험. `validate`만 허용 |
| 외부 아이콘 라이브러리 추가 | 이모지/유니코드로 대체 (아이콘 의존성 없음) |
| 하드코딩 컬러값 | `constants/colors.js` 토큰만 사용 |
| CSS-in-JS (styled-components 등) | inline style만 허용 |
| `accessToken` localStorage 저장 | XSS 취약. 메모리 전용 |
| CORS `allowed-origins: *` | 정확한 도메인만 나열 |
| IDOR 미검사 PUT/DELETE | 반드시 소유자 본인 확인 (`auth.getName()`) |
| `.env.local` / 시크릿 파일 커밋 | `.gitignore`에 포함됨 |

---

## 5. 자동화 규칙

### 기획 자동 Loop
메시지에 **"기획"** 포함 → 즉시 `/loop` 스킬 호출 → 아래 순서 자동 수행:
1. `DESIGN_PROMPTS/design/DESIGN_PROMPT_<feature>.md` 작성 (Claude.ai 아티팩트 프롬프트)
2. 백엔드 구현 (엔티티/서비스/컨트롤러)
3. 프론트엔드 구현 (페이지/컴포넌트/API 연동)
4. 디자인 완성
5. `/verify` 런타임 검증
6. `git commit + push`

### 작업 완료 규칙
모든 작업 후 반드시: **CLAUDE.md 업데이트 → git commit → git push**

---

## 6. AI 협업 역할

| AI 도구 | 담당 영역 |
|---------|----------|
| **Pomelli** | 기획 — 요구사항 분석, 기능 정의, 사용자 플로우, 우선순위 |
| **Stitch** | 디자인 — UI/UX, 컴포넌트 구조, 디자인 시스템, 반응형 레이아웃 |
| **AI Studio** | 자동화 — 반복 작업, 스크립트 생성, 배포 워크플로우 |
| **Claude Code** | 구현 — 백엔드/프론트/모바일 코드 작성, 보안 검토, 리뷰 |

**원칙:** 기획 변경 → Pomelli 기준 / UI 변경 → Stitch 우선 반영 / 자동화 → AI Studio 활용

---

## 7. 현재 디자인 방향 (2026-06-29 업데이트)

**Cosmos × Pinterest 다크 에디토리얼** (iOS Liquid Glass는 DEPRECATED → `DESIGN_PROMPTS/deprecated/`)

| 원칙 | 실제 값 | 상태 |
|------|---------|------|
| 앱 배경 | `#090909` (순수 블랙) | ✅ 구현 완료 |
| 카드 | 테두리/그림자 없음, 이미지 직접 얹힘 | ✅ 구현 완료 |
| 그리드 | CSS columns 마소닉, 2→3→4컬럼 | ✅ 구현 완료 |
| BottomNav | blur + active top-accent | ✅ 구현 완료 |
| 장르 탭바 (dark) | Cosmos 언더라인 (bold+2px 흰선) | ✅ 구현 완료 |
| ExplorePage | 검색+장르탭+그리드 (무드/비율/태그 필터 제거) | ✅ 구현 완료 |
| 이미지 에디터 | `#080810` 프리미엄 다크 (예외) | — |
| 어드민 패널 | glass.js light 계열 유지 (예외) | — |

**실제 컬러 토큰 (constants/colors.js):**
```
primary: '#5b6ef5'   primaryDark: '#4458e0'   accent: '#a78bfa'
bg(dark): '#090909'  surface(dark): '#0f0f0f'  border(dark): rgba(255,255,255,0.07)
text(dark): '#e8e8f0'  danger: '#e53e3e'
```

---

## 8. 백엔드 패키지 구조 (`com.happiness.app`)

```
photo/        — 사진 CRUD, 좋아요/저장/공유/태그
member/       — 인증, 소셜 OAuth (카카오/구글/네이버/Apple)
portfolio/    — 공개 포트폴리오, 템플릿 시스템
series/       — 시리즈/컬렉션 (GET 공개, 나머지 인증 필요 + IDOR 검사)
inquiry/      — 촬영 문의 (전송 공개, 수신함 인증)
follow/       — 팔로우/언팔로우/피드
comment/      — 댓글/대댓글 (parentId nullable)
feed/         — 팔로우 유저 최신 사진 (JPQL + Pageable)
delivery/     — 클라이언트 납품 포털 (BCrypt 비밀번호, 5회 차단)
analytics/    — 방문자 분석 (visitorToken 60req/min)
booking/      — 촬영 예약 캘린더 (IP 10req/min)
testimonial/  — 고객 추천사
press/        — 언론/수상 기록
pricing/      — 촬영 패키지
brand/        — 클라이언트 브랜드
newsletter/   — 뉴스레터 구독
storage/      — Supabase Storage 연동 (POST /api/upload/image)
```

**Spring 프로파일:**
- `dev`: H2 in-memory, Redis localhost, SQL 로그 ON
- `prod`: PostgreSQL, Upstash Redis, SQL 로그 OFF, `ddl-auto: validate`

---

## 9. 프론트엔드 라우트 구조

**공개 (로그인 불필요):**
```
/portfolio/:profileName          — PortfolioPage (템플릿 시스템 8종)
/portfolio/:profileName/slideshow — 풀스크린 슬라이드쇼
/inquiry/:profileName            — 촬영 문의 폼 (standalone)
/proof/:token                    — 납품 사진 확인 (standalone, BCrypt)
/booking/:profileName            — 촬영 예약 3단계 위저드 (standalone)
/oauth/kakao|google|naver/callback  — OAuth 콜백
/oauth/apple/result              — Apple 백엔드 리다이렉트 결과
```

**보호 (로그인 필요):**
```
/                — GalleryPage
/explore         — ExplorePage (검색+Cosmos 언더라인 장르탭+마소닉 그리드, 심플화)
/list            — ListPage
/photo/new       — PhotoFormPage
/photo/:id       — PhotoDetailPage
/photo/:id/edit  — PhotoFormPage
/profile         — ProfilePage (6탭)
/series          — SeriesPage
/inbox           — InquiryInboxPage
/feed            — FeedPage
/editor          — ImageEditorPage (standalone)
/deliveries      — DeliveriesPage
/bookings        — BookingDashboard
```

**어드민 (`requiredRoles=['ADMIN']`):**
```
/admin                 — 대시보드
/admin/gallery-order   — 드래그 순서 관리
/admin/members         — 회원 관리
/admin/photos          — 사진 목록 + 장르 편집
/admin/categories      — 장르 분포 통계
/admin/tags            — 태그 목록/삭제/병합
/admin/moderation      — 신고 관리 (2단계 삭제 확인)
```

---

## 10. 인증 구조

- **accessToken**: 메모리 전용 (Zustand `authStore`)
- **refreshToken**: sessionStorage (`rt` 키)
- **user**: sessionStorage (`auth_user` 키)
- `isAuthenticated`: `!!refreshToken && !!user`
- `ProtectedRoute`: Zustand `useAuthStore` 사용 (AuthContext 아님)
- `MemberResponse`: `WM/SA` 역할 → `"ADMIN"` 문자열로 매핑 (프론트 통일)

**소셜 OAuth 공통 흐름:**
```
로그인 버튼 → OAuth 제공자 → /oauth/{provider}/callback
→ POST /api/auth/oauth/{provider} → TokenResponse
→ authStore.loginSuccess(accessToken, refreshToken, member)
```

---

## 11. 보안 체크리스트

- [ ] 모든 PUT/DELETE에 `Authentication auth` + `series.getMemberId().equals(requesterId)` IDOR 검사
- [ ] 파일 업로드: MIME 타입(`JPEG/PNG/WebP/GIF`) + 최대 20MB + UUID 파일명
- [ ] `folder` 파라미터에 `..`, `/` 포함 시 400 반환
- [ ] Rate Limiting: IP 기반 100req/60s (`ApiAccessInterceptor`)
- [ ] Redis 장애 시 허용 통과 (개발 환경 Redis 없이 동작)
- [ ] 비밀번호 5회 초과 → 15분 차단 (DeliverySet)

---

## 12. DB 마이그레이션 원칙

새 컬럼/테이블 추가 시:
1. `CLAUDE.md`의 "운영 DB 수동 마이그레이션" 섹션에 SQL 추가
2. `IF NOT EXISTS` / `IF EXISTS` 구문 필수 (멱등성)
3. 운영 Supabase SQL Editor에서 수동 실행
4. `application-prod.yml`은 `ddl-auto: validate` — 절대 변경 금지

---

## 13. CI/CD 파이프라인

```
PR to master  →  backend-ci + frontend-ci (병렬)
push to master → backend-ci → frontend-ci → docker-build → deploy (순차)
```

**backend-ci:**
```bash
./gradlew test --no-daemon
./gradlew bootJar -x test --no-daemon
```

**frontend-ci:**
```bash
npm ci
npm run build
npm test -- --watchAll=false --passWithNoTests
```

**필요한 GitHub Secrets:**
`RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`

---

## 14. 이미지 보정 엔진 (ImageEditorPage)

**파이프라인 순서 (`applyEffects`):**
```
1. buildChannelLUTs (exposure/contrast/whites/blacks + 온도/색조)
2. renderWithChannelLUTs
3. applyVibranceSaturation (바이브런스/채도)
4. applyCalibration (RGB 원색 보정)
5. applyHSLAdjustments (8색상 HSL)
6. applyColorGrading (존별 색 보정)
7. applySharpening (언샵마스크)
8. applyNoiseReduction (크로마+루마 블러)
9. applyUnsharpMask + applyDehaze + applyVignette + applyGrain
```

**내장 스타일 프리셋 9종:** Fuji Velvia, Kodak Portra, Matte Fade, B&W Dramatic, Golden Hour, Cool Cinematic, Pastel Dream, Vibrant Pop, Y2K 필름 스냅

---

## 15. 포트폴리오 템플릿 시스템 (Feature 28)

`GET /api/portfolio/{profileName}/config` → `template` 값으로 분기:

| 템플릿 | 컴포넌트 | 특징 |
|--------|---------|------|
| `EDITORIAL` | TemplateEditorial | 기본, 에디토리얼 단일 스크롤 |
| `SCRL` | TemplateScrl | scroll-snap + 도트 인디케이터 |
| `MINIMAL` | TemplateMinimal | 흰 배경 3열 정방형 그리드 |
| `DARK_ROOM` | TemplateDarkRoom | #080808 + 마우스 스포트라이트 |
| FILM/SPLIT/MOSAIC/MAGAZINE | EDITORIAL 폴백 | "준비 중" 배너 |

---

## 16. 디자인 우선순위 현황

**P0 (블로커):** 빈 상태 UI / 갤러리 모바일 2컬럼 / 모달 스크롤 잠금 / 이미지 alt 접근성  
**P1 (단기):** 스켈레톤 로딩 / 공통 Button/Input 컴포넌트 / Header 드롭다운  
**P2 (중기):** PhotoForm 2컬럼 레이아웃 / Before-After 슬라이더 / 무한 스크롤

전체 로드맵: `DESIGN_PROMPTS/00_ROADMAP.md` 참조

---

## 17. 갤러리 레이아웃 알고리즘

`packRows()`: `gridColSpan` 합이 12가 되도록 행 구성 → CSS flexbox로 렌더링  
각 사진: `flex: gridColSpan` 비율로 너비 배분 (12-컬럼 그리드)

---

## 18. DESIGN_PROMPTS 폴더 구조 (2026-06-27 재정리)

```
DESIGN_PROMPTS/
├── 00_ROADMAP.md          ← 전체 인덱스 (파일 목록 + 우선순위)
├── planning/              ← 기획서 31개 (기능별 순번형 01~32)
├── design/                ← Claude.ai 아티팩트 프롬프트 + 디자인 시스템 5개
│   ├── DESIGN_PROMPT_*.md   (Claude.ai 아티팩트 프롬프트)
│   └── 31_COSMOS_PINTEREST_DESIGN_SYSTEM.md
├── deprecated/            ← 폐기 문서 (iOS 26 Liquid Glass 21/22/23번)
└── review/                ← 검토 문서 1개
```

**규칙:** 새 기획 → `planning/`, 디자인 프롬프트 → `design/DESIGN_PROMPT_<feature>.md`

---

## 19. 모바일 주의사항

- Android 에뮬레이터 API URL: `http://10.0.2.2:8080` (localhost 아님)
- 이미지 선택: `expo-image-picker` → `POST /api/upload/image`
- 앱 배포 전: `assets/icon.png` (1024×1024), `assets/splash.png` 실제 이미지 교체 필수
- 권한 선언: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (app.json)
