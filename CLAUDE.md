# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 에이전트 역할 정의

이 프로젝트에서 Claude는 작업 유형에 따라 아래 시니어급 역할로 동작한다.  
**모든 역할은 시니어 10년 이상 수준의 판단력·품질 기준을 유지한다.**

### 기획자 (PM / Product Manager)
- 사용자 가치 중심으로 기능 우선순위를 결정한다
- 요구사항 분석 → 유저 스토리 → 수용 기준(AC) 순으로 문서화한다
- 기술 부채와 비즈니스 임팩트를 함께 고려해 트레이드오프를 명시한다
- 새 기능 작업 시 `DESIGN_PROMPTS/` 하위에 기획 문서를 먼저 작성한다

### 디자이너 (Senior UX/UI Designer)
- 모바일 퍼스트, 접근성(WCAG 2.1 AA) 기준을 항상 준수한다
- 컬러는 `constants/colors.js` 토큰만 사용하고 하드코딩하지 않는다
- 이모지/유니코드로 아이콘을 대체하고 외부 아이콘 라이브러리를 추가하지 않는다
- 인터랙션마다 hover·focus·active 상태를 정의한다
- 스켈레톤 로딩과 EmptyState를 모든 비동기 화면에 적용한다

### 개발자 (Senior Full-Stack Developer)
- 프론트엔드: React 18 함수형 컴포넌트, inline style, React Router v6 준수
- 백엔드: Spring Boot 3 / Java 25, feature-based 패키지, JPA + JPQL 사용
- 보안 취약점(XSS, SQLi, IDOR, 파일 업로드 우회)을 코드 작성 시 자동으로 차단한다
- 외부 라이브러리 추가 전 반드시 기존 코드로 구현 가능한지 먼저 검토한다
- 모든 API 호출은 try-catch + 사용자 친화적 오류 처리를 포함한다

### QA (Senior QA Engineer)
- 기능 구현 후 반드시 골든 패스(happy path) + 엣지 케이스를 모두 테스트한다
- 백엔드: `./gradlew test` 통과 확인 후 커밋한다
- 프론트엔드: `npm run build` 성공 확인, 수동 체크리스트(로그인·CRUD·반응형) 수행
- 회귀(regression) 가능성이 있는 변경은 인접 기능도 함께 검증한다
- 테스트 실패 시 "무시하고 배포" 금지 — 근본 원인을 찾아 수정한다

### DBA (Senior Database Administrator)
- 운영 DB는 `ddl-auto: validate` 고정 — `create`/`create-drop` 절대 금지
- 새 컬럼·인덱스·테이블은 `CLAUDE.md` 운영 DB 마이그레이션 섹션에 SQL을 기록한다
- N+1 쿼리 발생 가능성을 항상 검토하고 JPQL fetch join 또는 별도 쿼리로 해결한다
- 인덱스는 WHERE·ORDER BY·JOIN 컬럼에만 추가하고 과잉 인덱싱을 피한다
- 운영 마이그레이션은 `IF NOT EXISTS` / `IF EXISTS` 구문으로 멱등성을 보장한다

### Admin (어드민 운영자)
- 위 5개 역할의 권한을 모두 갖는다 (기획 + 디자인 + 개발 + QA + DB)
- 어드민 전용 기능(`/admin/**`)은 인증된 ADMIN 역할만 접근 가능하도록 강제한다
- 회원 관리·콘텐츠 삭제·순서 변경 등 불가역적 작업은 확인 다이얼로그를 반드시 추가한다
- 어드민 UI는 실수를 방지하는 방향으로 설계한다 (위험 액션은 빨간색 + 이중 확인)
- 운영 데이터 접근 로그는 서버 콘솔에 INFO 레벨로 남긴다

---

## 에이전트 역할 정의

이 프로젝트에서 Claude는 작업 유형에 따라 아래 시니어급 역할로 동작한다.  
**모든 역할은 시니어 10년 이상 수준의 판단력·품질 기준을 유지한다.**

### 기획자 (PM / Product Manager)
- 사용자 가치 중심으로 기능 우선순위를 결정한다
- 요구사항 분석 → 유저 스토리 → 수용 기준(AC) 순으로 문서화한다
- 기술 부채와 비즈니스 임팩트를 함께 고려해 트레이드오프를 명시한다
- 새 기능 작업 시 `DESIGN_PROMPTS/` 하위에 기획 문서를 먼저 작성한다

### 디자이너 (Senior UX/UI Designer)
- 모바일 퍼스트, 접근성(WCAG 2.1 AA) 기준을 항상 준수한다
- 컬러는 `constants/colors.js` 토큰만 사용하고 하드코딩하지 않는다
- 이모지/유니코드로 아이콘을 대체하고 외부 아이콘 라이브러리를 추가하지 않는다
- 인터랙션마다 hover·focus·active 상태를 정의한다
- 스켈레톤 로딩과 EmptyState를 모든 비동기 화면에 적용한다

### 개발자 (Senior Full-Stack Developer)
- 프론트엔드: React 18 함수형 컴포넌트, inline style, React Router v6 준수
- 백엔드: Spring Boot 3 / Java 25, feature-based 패키지, JPA + JPQL 사용
- 보안 취약점(XSS, SQLi, IDOR, 파일 업로드 우회)을 코드 작성 시 자동으로 차단한다
- 외부 라이브러리 추가 전 반드시 기존 코드로 구현 가능한지 먼저 검토한다
- 모든 API 호출은 try-catch + 사용자 친화적 오류 처리를 포함한다

### QA (Senior QA Engineer)
- 기능 구현 후 반드시 골든 패스(happy path) + 엣지 케이스를 모두 테스트한다
- 백엔드: `./gradlew test` 통과 확인 후 커밋한다
- 프론트엔드: `npm run build` 성공 확인, 수동 체크리스트(로그인·CRUD·반응형) 수행
- 회귀(regression) 가능성이 있는 변경은 인접 기능도 함께 검증한다
- 테스트 실패 시 "무시하고 배포" 금지 — 근본 원인을 찾아 수정한다

### DBA (Senior Database Administrator)
- 운영 DB는 `ddl-auto: validate` 고정 — `create`/`create-drop` 절대 금지
- 새 컬럼·인덱스·테이블은 `CLAUDE.md` 운영 DB 마이그레이션 섹션에 SQL을 기록한다
- N+1 쿼리 발생 가능성을 항상 검토하고 JPQL fetch join 또는 별도 쿼리로 해결한다
- 인덱스는 WHERE·ORDER BY·JOIN 컬럼에만 추가하고 과잉 인덱싱을 피한다
- 운영 마이그레이션은 `IF NOT EXISTS` / `IF EXISTS` 구문으로 멱등성을 보장한다

### Admin (어드민 운영자)
- 위 5개 역할의 권한을 모두 갖는다 (기획 + 디자인 + 개발 + QA + DB)
- 어드민 전용 기능(`/admin/**`)은 인증된 ADMIN 역할만 접근 가능하도록 강제한다
- 회원 관리·콘텐츠 삭제·순서 변경 등 불가역적 작업은 확인 다이얼로그를 반드시 추가한다
- 어드민 UI는 실수를 방지하는 방향으로 설계한다 (위험 액션은 빨간색 + 이중 확인)
- 운영 데이터 접근 로그는 서버 콘솔에 INFO 레벨로 남긴다

---

## 작업 완료 규칙

**모든 작업이 완료되면 반드시 아래를 수행한다:**
1. 작업 내용을 이 CLAUDE.md에 반영 (아키텍처 변경, 새 파일, 설정 변경)
2. 변경 사항 요약 후 `git commit` + `git push` 까지 완료

---

## 디자인 작업 규칙

**UI/UX 관련 작업(신규 화면, 컴포넌트 개선, 레이아웃 변경)을 할 때는 반드시 아래를 수행한다:**

1. 작업 전에 `DESIGN_PROMPT_<feature>.md` 파일을 생성한다
2. 파일 안에 claude.ai에서 아티팩트로 요청할 수 있는 프롬프트를 작성한다
3. 프롬프트에는 반드시 아래 시스템 컨텍스트를 포함한다:

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 사용 (외부 아이콘 라이브러리 없음)

현재 컬러 시스템:
  primary:       '#5b6ef5'
  primaryDark:   '#4458e0'
  primaryLight:  '#eef0ff'
  accent:        '#a78bfa'
  bg:            '#f5f5fa'
  surface:       '#ffffff'
  border:        '#e2e2ee'
  text:          '#1a1a2e'
  textSecondary: '#5c5c7a'
  textMuted:     '#9090b0'
  danger:        '#e53e3e'
  darkBg:        '#0a0a18'
  darkSurface:   '#12122a'
  galleryBg:     '#0e0e0e'

규칙:
- export default 함수형 컴포넌트 1개만 반환
- style은 inline object 사용
- 외부 라이브러리 import 없음 (react, react-router-dom만 허용)
- 한국어 UI 텍스트
```

4. 생성된 디자인 프롬프트 MD는 작업 후 `DESIGN_PROMPTS/` 폴더에 정리한다

### 디자인 작업 우선순위 로드맵

전체 우선순위 및 각 작업별 프롬프트 파일은 `DESIGN_PROMPTS/DESIGN_ROADMAP.md` 참조.

**P0 — 즉시 수정 (블로커)**
| 파일 | 작업 |
|------|------|
| `P0_01_EMPTY_STATE.md` | 갤러리·탐색·프로필 빈 상태 UI |
| `P0_02_GALLERY_RESPONSIVE.md` | 갤러리 반응형 (모바일 2컬럼) + useBreakpoint 훅 |
| `P0_03_COMMENTS_SECTION.md` | CommentsSection 컴포넌트 분리 (Modal·Detail 공용) |
| `P0_04_MODAL_UX.md` | 모달 body 스크롤 잠금 + 포커스 트랩 |
| `P0_05_IMAGE_ALT.md` | 이미지 alt 텍스트 + aria-label 접근성 |

**P1 — 단기 (1~2주)**
| 파일 | 작업 |
|------|------|
| `P1_01_SKELETON_LOADING.md` | shimmer 스켈레톤 카드 (갤러리·탐색·목록) |
| `P1_02_BUTTON_COMPONENT.md` | 공통 Button 컴포넌트 (variant/size/loading) |
| `P1_03_INPUT_COMPONENT.md` | 공통 Input·Textarea·FormField 컴포넌트 |
| `P1_04_HEADER_REDESIGN.md` | Header 아바타 드롭다운 (프로필·로그아웃) |
| `P1_05_EXPLORE_SORT.md` | 탐색 정렬·활성 필터 배지·결과 수 표시 |
| `P1_06_AVATAR_UPLOAD.md` | 프로필 아바타 이미지 업로드 |
| `08_COLOR_PALETTE_DETAIL.md` | 5색 팔레트 추출 · PhotoDetail 강화 (네비게이션/전체화면/관련사진/공유/인쇄) |
| `10_ADMIN_PANEL.md` | Admin 패널 — 갤러리 순서 관리(GalleryOrderPage) · 회원 관리 · 대시보드 |

**P2 — 중기 (1개월)**
| 파일 | 작업 |
|------|------|
| `P2_01_PHOTOFORM_LAYOUT.md` | PhotoForm 2컬럼 레이아웃 (프리뷰·보정패널·메타데이터 바) |
| `P2_02_BEFORE_AFTER.md` | Before/After 이미지 스플릿 슬라이더 |
| `P2_03_INFINITE_SCROLL.md` | 무한 스크롤 (useInfiniteScroll 훅) |
| `P2_04_DRAFT_AUTOSAVE.md` | PhotoForm 드래프트 자동저장 (useDraft 훅) |
| `P2_05_AUTHOR_PROFILE.md` | 작가 공개 프로필 페이지 (/u/:profileName) |
| `09_PORTFOLIO_BUILDER.md` | 슬라이드쇼 뷰어 · 매거진 레이아웃 · PDF 내보내기 · 임베드 코드 |
| `11_IMAGE_EDITOR.md` | 독립 이미지 에디터 SPA — React+TS+Zustand+Konva, 업로드·Transform·색상보정·필터·오버레이·Export (Format.com 스타일) |

---

## Project Overview

**사진작가 포트폴리오 앱** — 풀스택 3-tier 구성:
- **backend/** — Spring Boot 3.4.5 + Java 25, Gradle 9.5
- **frontend/** — React 18 SPA
- **mobile/** — React Native 0.72 + Expo 49

기능 분석 및 로드맵 전체 내용: **`PORTFOLIO_FEATURES.md`** 참조

---

## Commands

### Backend
```bash
cd backend
./gradlew bootRun                        # Run dev server (port 8080)
./gradlew clean build -x test            # Build JAR (skip tests)
./gradlew test                           # Run tests
./gradlew test --tests "FullClassName"   # Run a single test class
./gradlew bootJar -x test --no-daemon    # 운영용 JAR 빌드 (app.jar)
```
H2 console available at `http://localhost:8080/h2-console` in dev.  
Production profile: `SPRING_PROFILES_ACTIVE=prod` → PostgreSQL 사용.

### Frontend
```bash
cd frontend
npm install
npm start           # Dev server on port 3000 (.env.development 로드)
npm test
npm run build       # 운영 빌드 (.env.production 로드)
```

### Mobile
```bash
cd mobile
npm install
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator (uses 10.0.2.2:8080, not localhost)
```

### Docker (로컬 전체 스택 실행)
```bash
# 루트에서
cp .env.local.example .env.local   # 처음 한 번만 — 실제 값 채울 것
docker-compose up --build          # backend + redis 컨테이너 기동
docker-compose down                # 종료
```

---

## Deployment Architecture

```
User (Web / iOS / Android)
       │
       ▼
Cloudflare (무료 DNS + SSL + CDN + DDoS 보호)
       │
 ┌─────┴──────────────┐
 ▼                    ▼
app.example.com    api.example.com
 │                    │
Vercel             Railway
React SPA          Spring Boot
(무료)             (Hobby $5/월)
                       │
          ┌────────────┼──────────────┐
          ▼            ▼              ▼
     Supabase      Supabase       Upstash Redis
     PostgreSQL    Storage        (무료 10K cmd/일)
     (무료 500MB)  (무료 1GB)
```

### 서비스별 역할

| 영역 | 서비스 | 비용 |
|------|--------|------|
| Frontend | Vercel | 무료 |
| Backend | Railway | $5/월 |
| DB | Supabase PostgreSQL | 무료 (500MB) |
| Storage | Supabase Storage | 무료 (1GB) |
| Cache | Upstash Redis | 무료 (10K/일) |
| DNS + SSL | Cloudflare | 무료 |
| CI/CD | GitHub Actions | 무료 (2000분/월) |
| 도메인 | .com 구매 | ~$10/년 |

---

## Environment Variables

### 환경변수 관리 원칙
- **`.env.local`** — 로컬 개발 시크릿 (절대 커밋 금지, .gitignore 포함)
- **`.env.local.example`** — 팀원 공유용 템플릿 (커밋 가능, 실제 값 없음)
- **Railway Variables** — 운영 환경변수 (Railway 대시보드에서 설정)
- **GitHub Secrets** — CI/CD 파이프라인용 시크릿

### 필수 환경변수 목록

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...           # 프론트엔드/백엔드 공용
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 백엔드 전용 (절대 프론트 노출 금지)
SUPABASE_BUCKET=images

# JWT
JWT_SECRET=<openssl rand -base64 64>  # 최소 256비트

# Database (운영)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://default:token@host:port  # 운영 Upstash
REDIS_HOST=localhost                        # 로컬 개발

# CORS
CORS_ALLOWED_ORIGINS=https://app.example.com

# Spring
SPRING_PROFILES_ACTIVE=prod  # 운영 | dev (기본값)

# Kakao OAuth (프론트엔드 — .env.development / Vercel)
REACT_APP_KAKAO_APP_KEY=YOUR_KAKAO_REST_API_KEY
REACT_APP_KAKAO_REDIRECT_URI=https://app.example.com/oauth/kakao/callback

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
REACT_APP_GOOGLE_REDIRECT_URI=https://app.example.com/oauth/google/callback

# Naver OAuth
REACT_APP_NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID
REACT_APP_NAVER_REDIRECT_URI=https://app.example.com/oauth/naver/callback

# Apple OAuth (HTTPS 필수)
REACT_APP_APPLE_CLIENT_ID=com.happiness.gallery.web
REACT_APP_APPLE_REDIRECT_URI=https://api.example.com/api/auth/oauth/apple/callback
```

---

## Architecture

### Backend (`com.happiness.app`)

Feature-based package layout:

- **photo/** — Core domain. `PhotoController` exposes REST endpoints for CRUD plus likes/saves/shares/tags. Entities: `Photo`, `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag`.
- **member/** — Auth & users. `AuthController` handles signup/login/stats/password-change. `KakaoOAuthService` handles Kakao OAuth. `SecurityConfig` (in `config/`) configures Spring Security. `Member` entity includes: avatarUrl, coverUrl, bio, websiteUrl, location, specialties (Phase 2-8 추가). `MemberStatsResponse` — 통계 6종(photoCount/totalLikes/totalSaves/totalShares/inquiryCount/unreadInquiryCount). Endpoints: `GET /member/:id/stats`, `PUT /member/:id/password`.
- **member/service/GoogleOAuthService** — Google OAuth 2.0. `googleLogin(code)` → Token URL: `oauth2.googleapis.com/token`, UserInfo: `googleapis.com/oauth2/v2/userinfo`.
- **member/service/NaverOAuthService** — 네이버 OAuth 2.0. `naverLogin(code, state)` → Token: `nid.naver.com/oauth2.0/token`, UserInfo: `openapi.naver.com/v1/nid/me`.
- **member/service/AppleOAuthService** — Apple Sign In. `appleLogin(idToken, userJson)` → id_token JWT 디코딩(base64)으로 sub+email 추출. `generateClientSecret()` → JJWT ES256으로 client_secret JWT 생성.
- **member/service/AuthService** — `issueTokensForOAuth(MemberResponse, HttpRequest)` 추가 — 소셜 로그인 공통 JWT 발급.
- **portfolio/** — `PortfolioController` (`GET /api/portfolio/{profileName}`) — 공개 포트폴리오. 로그인 불필요. MemberRepository.findByProfileName + PhotoRepository.findByMemberIdOrderByCreatedAtDesc 사용.
- **series/** — `SeriesController` (`/api/series`) — 시리즈/컬렉션 CRUD. `Series` 엔티티 + `SeriesPhoto` 조인 테이블. GET(목록/상세)은 공개, POST/PUT/DELETE/사진추가제거는 인증 필요.
- **inquiry/** — `InquiryController` (`/api/inquiry`) — 촬영 문의. `Inquiry` 엔티티. POST(문의 전송)는 공개. `InquiryEmailService`는 `@Autowired(required=false)`로 메일 서버 없어도 동작. 수신함/읽음처리/삭제는 인증 필요.
- **storage/** — Supabase Storage 연동. `SupabaseStorageService` (WebClient 기반 업로드/삭제), `StorageController` (`POST /api/upload/image`).
- **follow/** — `FollowController` (`/api/follows`) — 팔로우/언팔로우/확인/카운트/목록. `Follow` 엔티티 (UniqueConstraint on follower_id+following_id). `FollowService.getFollowingIds()` — FeedController에서 피드 구성에 사용.
- **comment/** — `CommentController` (`GET/POST /api/photos/:id/comments`, `DELETE /api/comments/:id`). `Comment` 엔티티 (parentId nullable = 대댓글 지원). `CommentService.getComments()` — LinkedHashMap으로 top-level 수집 후 replies attach.
- **feed/** — `FeedController` (`GET /api/feed?memberId=&page=&size=`) — `FollowService.getFollowingIds()` + `PhotoRepository.findByMemberIdInOrderByCreatedAtDesc()` (JPQL + Pageable).
- **photo/service/AutoTagService** — 키워드 추출(title+description, stop-word 필터) + MOOD_TAGS 매핑. `POST /api/photos/:id/auto-tags` (max 10 tags).
- **common/** — `HelloController` (health check), `ImageProcessingUtil` (upload + Thumbnailator resize).
- **board/** — Placeholder; `Board`/`Content` entities with repositories, no service layer yet.
- **config/** — `WebConfig` (CORS 설정 포함), `SecurityConfig`, `RedisConfig`, `AsyncConfig`.

#### Spring 프로파일 구성

```
src/main/resources/
├── application.yml          # 공통 설정 + 환경변수 바인딩
├── application-dev.yml      # H2 in-memory, Redis localhost, SQL 로그 ON
└── application-prod.yml     # PostgreSQL, Upstash Redis, SQL 로그 OFF, ddl-auto=validate
```

**운영 주의사항**: `application-prod.yml`의 `ddl-auto: validate` — 절대 `create`/`create-drop` 금지.

**운영 DB 수동 마이그레이션 필요** (새 컬럼 추가 시):
```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS display_order INTEGER;
ALTER TABLE series ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  receiver_member_id BIGINT NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  shoot_type VARCHAR(50),
  shoot_date VARCHAR(100),
  budget VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Phase 3 — 팔로우/댓글/EXIF
CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  photo_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  member_avatar_url VARCHAR(500),
  content TEXT NOT NULL,
  parent_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS camera_model  VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS lens_model    VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS aperture      VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS shutter_speed VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS iso           INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS focal_length  VARCHAR(20);
```

#### PhotoRepository 주요 쿼리 메서드

```java
findByMemberIdOrderByCreatedAtDesc(Long memberId)   // 멤버별 사진
findByColorMoodOrderByCreatedAtDesc(String mood)     // 무드별 사진
search(keyword, colorMood, memberId, imageRatio, Sort) // 복합 필터+동적 정렬 (JPQL + Sort)
searchFuzzy(kw, colorMood, memberId, imageRatio)    // pg_trgm 유사도 검색 (native, PostgreSQL only, H2 fallback)
findTitleSuggestions(q, Pageable)                   // 자동완성용 제목 목록 (JPQL LIKE, 최대 5건)
findByMemberIdInOrderByCreatedAtDesc(List<Long>, Pageable) // 피드 — 팔로우 유저 최신순
findIdsByMemberId(Long memberId)                     // 계정 삭제 cascade용 photo ID 목록
deleteByMemberId(Long memberId)                      // 회원 탈퇴 시 cascade
```

**검색 fallback 전략** (`PhotoController.getAllPhotos`):
- 키워드 있을 때: `searchFuzzy()` → `DataAccessException` 시 `search()` LIKE로 자동 fallback
- 키워드 없을 때: `search()` JPQL (동적 Sort 지원)

**운영 DB 설정** (Supabase SQL Editor, 최초 1회):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- 한글·영문 대소문자 무관 검색을 위한 LOWER() 표현식 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_photos_title_trgm ON photos USING GIN (LOWER(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_photos_desc_trgm  ON photos USING GIN (LOWER(description) gin_trgm_ops);
```

**사진 삭제 시 cascade 순서** (`PhotoController.deletePhoto`):
1. `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag` 연관 레코드 먼저 삭제
2. 이미지 파일 삭제 (`ImageProcessingUtil.deleteImage`)
3. `Photo` 엔티티 삭제

#### 파일 업로드 API

```
POST /api/upload/image?folder=photos
Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file=<이미지>

Response: { "url": "https://...supabase.co/storage/v1/object/public/images/photos/uuid.jpg", "status": "success" }
```

- 허용 타입: JPEG, PNG, WebP, GIF
- 최대 크기: 20MB
- 파일명: UUID 자동 생성 (경로 예측 불가)
- `folder` 파라미터에 `..` 및 `/` 포함 시 400 반환

### Frontend (`src/`)

- **pages/** — Route-level components (Login, SignUp, Gallery, Explore, List, PhotoDetail, PhotoForm, **Profile**, **Portfolio**, **KakaoCallback**, **Series**, **InquiryFormPage**, **InquiryInboxPage**, **PhotoSortPage**, **FeedPage**, **ImageEditorPage**, **admin/AdminDashboardPage**, **admin/AdminGalleryOrderPage**, **admin/AdminMembersPage**, **admin/AdminPhotosPage**). **ImageEditorPage** (`/editor`, ProtectedRoute): useReducer 기반 EditorContext, 3-panel 레이아웃(LeftPanel 썸네일 스트립 + CenterCanvas + RightPanel 탭), 비파괴 편집(EditState per image), Undo/Redo(50단계), 전체 페이지 Drag & Drop 업로드(UploadDropZone), Ctrl+Z/Y/Escape 단축키, `?photoId=` 쿼리로 갤러리 사진 자동 로드, ExportModal(JPG/PNG/WEBP, 품질·크기 설정, 다중 순차 다운로드, Supabase 갤러리 업로드). **ProfilePage** (Phase 2-8): 4탭 구조(내 작품·저장함·시리즈·설정), 아바타/커버 이미지 업로드(hover overlay), 6종 통계, 설정 탭에 확장 폼(bio/websiteUrl/location/specialties 체크박스) + 비밀번호 변경(kakao 유저 숨김). **FeedPage** (Phase 3): 팔로우 유저 최신 사진, 더 보기 페이지네이션, 빈 피드 안내. **PhotoDetailPage** (Phase 4 강화): 컬러 팔레트(useColorExtraction K-means), 전체화면 뷰어(PhotoViewer), 이전/다음 네비게이션(PhotoNavigation), 공유 버튼(ShareButton), 관련 사진(RelatedPhotos), 인쇄 CSS 포함. **PortfolioPage** (Phase 4 재설계): lisamicheleburns.com 참조 — 에디토리얼 단일 스크롤 레이아웃. ① 80vh 풀블리드 Hero(커버 이미지 or 다크 그라디언트 + 오버레이 텍스트) ② Stats Bar(backdrop-blur 반투명 바, 팔로워/팔로잉 클릭 모달) ③ Bio 섹션(이탤릭 인용) ④ Sticky 무드 필터 ⑤ CSS columns 마소닉 갤러리(4→3→2컬럼 반응형, hover 오버레이) ⑥ 시리즈 수평 스크롤 섹션 ⑦ Footer CTA("함께 작업하고 싶으신가요?"). 탭 구조 제거, 전문 포트폴리오 사이트 무드. **Admin Panel** (`/admin/**`, ADMIN 권한): AdminLayout(사이드바 + 상단바), 대시보드, GalleryOrderPage(멤버 선택 + 드래그 정렬), MembersPage(검색 + 권한변경 + 삭제), PhotosPage(검색 + 강제삭제).
- **components/layout/Header** — PC 상단 헤더(768px 이상) + 모바일 하단 BottomNav(768px 미만) 분기. BottomNav: 탐색·갤러리·등록(원형 강조)·목록·프로필, safe-area 대응. PC 헤더: 문의함 링크에 미읽음 배지 표시 (inquiryApi.getUnreadCount)
- **components/common/Toast** — 타입별(success/error/warning/info) 컬러 바+아이콘, 최대 3개 스택, 오른쪽 슬라이드 애니메이션. `ToastStack` 컴포넌트로 다중 토스트 표시 가능
- **components/common/GridSpanPicker** — 12-컬럼 너비 선택
- **components/common/ImageUploader** — 드래그&드롭 + 진행률 + 미리보기
- **components/photo/PhotoCard** — 이미지 카드 (색체학 무드 뱃지 포함)
- **components/photo/ColorPalette** — 5색 팔레트 표시 컴포넌트 (복사 기능, shimmer 로딩)
- **components/photo/PhotoViewer** — 전체화면 오버레이 뷰어 (ESC/클릭 닫기, 키보드 네비)
- **components/photo/PhotoNavigation** — 사진 이전/다음 화살표 오버레이 (키보드 ← →)
- **components/photo/ShareButton** — Web Share API / clipboard 공유 버튼
- **components/photo/RelatedPhotos** — 같은 작가 관련 사진 3열 그리드 (최대 6개)
- **components/layout/AdminLayout** — 어드민 사이드바+상단바 셸 (모바일 햄버거 지원)
- **hooks/useColorExtraction** — Canvas K-means(k=5) 대표 색상 추출 훅 (캐싱 포함)
- **contexts/AuthContext** — 전역 인증 상태 (login/signup/updateProfile/logout + localStorage)
- **hooks/usePhotos** — 사진 CRUD + 상태 관리
- **hooks/useToast** — 다중 토스트 상태 관리 (`toasts[]` 배열 + 타입별 자동 닫힘 시간), 구버전 단일 `toast` 객체 하위 호환 유지
- **services/api.js** — photoApi + authApi + inquiryApi + seriesApi
  - `photoApi.search({ keyword, colorMood, memberId, imageRatio, sortBy, order })` — 복합 필터+정렬 (GET /photos)
  - `photoApi.getAll({ sortBy, order })` — 전체 사진 목록 (정렬 지원)
  - `photoApi.getByMember(memberId, { sortBy, order })` — 멤버별 사진 목록
  - `photoApi.reorder(orders)` — 순서 일괄 저장 `[{id, displayOrder}]`
  - `authApi.kakaoLogin(code)` — POST /auth/oauth/kakao → TokenResponse
  - `authApi.googleLogin(code)` — POST /auth/oauth/google → TokenResponse
  - `authApi.naverLogin(code, state)` — POST /auth/oauth/naver → TokenResponse
  - `authApi.getMember(id)` — GET /auth/member/:id
  - `authApi.getStats(id)` — GET /auth/member/:id/stats (6종 통계)
  - `authApi.changePassword(id, data)` — PUT /auth/member/:id/password
  - `photoApi.getSuggestions(q)` — GET /photos/suggestions (자동완성)
  - `photoApi.searchByTags(tags, {sortBy, order})` — GET /photos?tags=콤마구분
  - `photoApi.getFeed(memberId, {page, size})` — GET /feed (팔로우 피드)
  - `photoApi.autoTag(photoId)` — POST /photos/:id/auto-tags
  - `followApi.follow/unfollow/isFollowing/getCount/getFollowers/getFollowing` — 팔로우 CRUD
  - `commentApi.getComments/addComment/deleteComment` — 댓글 CRUD
  - `inquiryApi.send/getInbox/getUnreadCount/markRead/remove` — 문의 CRUD
  - `seriesApi.getByMember/getOne/create/update/remove/addPhoto/removePhoto` — 시리즈 CRUD
- **services/uploadApi.js** — `uploadImage(file, folder, onProgress)` → Axios multipart 업로드
- **services/mockData.js** — (레거시, 현재 미사용)

Routing via React Router DOM v6. No Redux — state managed through Context + local state.

**공개 라우트** (로그인 불필요):
- `/portfolio/:profileName` — PortfolioPage (작가 공개 포트폴리오, 문의하기 버튼 포함)
- `/inquiry/:profileName?memberId=` — InquiryFormPage (촬영 문의 폼, 헤더 없는 standalone)
- `/oauth/kakao/callback` — KakaoCallbackPage (카카오 OAuth 콜백)
- `/oauth/google/callback` — GoogleCallbackPage (구글 OAuth 콜백)
- `/oauth/naver/callback` — NaverCallbackPage (네이버 OAuth 콜백)
- `/oauth/apple/result` — AppleResultPage (Apple 백엔드 리다이렉트 결과)

**보호 라우트** (로그인 필요):
- `/inbox` — InquiryInboxPage (문의 수신함)
- `/series` — SeriesPage (시리즈/컬렉션 관리)
- `/feed` — FeedPage (팔로우 피드)
- `/editor` — ImageEditorPage (이미지 에디터, Standalone — Header 없음)

**어드민 라우트** (ADMIN 권한 필요, `ProtectedRoute requiredRoles=['ADMIN']`):
- `/admin` — AdminDashboardPage (통계 카드 + 빠른 접근)
- `/admin/gallery-order` — AdminGalleryOrderPage (멤버 선택 + 드래그 순서 관리)
- `/admin/members` — AdminMembersPage (회원 목록, 권한 변경, 삭제)
- `/admin/photos` — AdminPhotosPage (전체 사진 목록, 강제 삭제)

> ⚠️ `/gallery/sort` (PhotoSortPage) 는 일반 사용자 앱에서 **제거**됨.  
> 사진 표시 순서 관리는 어드민 패널(`/admin/gallery-order`)로 이관. `10_ADMIN_PANEL.md` 참조.

**소셜 OAuth 흐름 (카카오/구글/네이버)**:
1. LoginPage 버튼 클릭 → OAuth 제공자 인증 페이지로 리다이렉트
2. 인증 후 `/oauth/{provider}/callback?code=xxx` 리다이렉트
3. Callback 페이지 → `POST /api/auth/oauth/{provider}` → `TokenResponse(accessToken, refreshToken, member)` 수신 → `authStore.loginSuccess()`

**Apple OAuth 흐름** (form_post 특수 처리):
1. LoginPage Apple 버튼 → `appleid.apple.com/auth/authorize` (redirect_uri=백엔드 URL)
2. Apple → `POST /api/auth/oauth/apple/callback` (백엔드)
3. 백엔드 → id_token 파싱 → 회원 생성/조회 → JWT 발급 → 프론트엔드 `/oauth/apple/result?accessToken=...` 리다이렉트
4. AppleResultPage → `/auth/member/:id` 호출 → `authStore.loginSuccess()`

**모든 OAuth 엔드포인트** → `TokenResponse` 반환 (accessToken, refreshToken, member 포함)
- `POST /api/auth/oauth/kakao` — `AuthService.issueTokensForOAuth()` 공통 처리
- `POST /api/auth/oauth/google` — GoogleOAuthService
- `POST /api/auth/oauth/naver` — NaverOAuthService
- `POST /api/auth/oauth/apple/callback` — AppleOAuthService (백엔드 form_post 수신)

**갤러리 12-컬럼 그리드**: `packRows()` 알고리즘으로 `gridColSpan` 합이 12가 되도록 사진을 행으로 묶어 CSS flexbox로 렌더링. 각 사진은 `flex: gridColSpan` 비율로 너비 배분.

#### Frontend 환경변수 파일

```
frontend/
├── .env.development    # npm start 시 로드 (localhost)
└── .env.production     # npm run build 시 로드 (운영 URL)
```

Vercel 배포 시 실제 값은 Vercel 대시보드 Environment Variables에서 설정.

### Mobile (`mobile/`)

**폴더 구조 규칙:**
```
mobile/
├── assets/       # 앱 아이콘, 스플래시, favicon (placeholder 포함)
├── components/   # 재사용 가능한 공통 UI 컴포넌트
│   └── ImageUploadButton.js  # expo-image-picker 기반 업로드 버튼
├── constants/    # 색상·여백·폰트 상수 (colors.js, layout.js)
├── hooks/        # 커스텀 훅 (usePhotos, useToast)
├── screens/      # 페이지 단위 컴포넌트
│   ├── LoginScreen.js / SignUpScreen.js
│   ├── ExploreScreen.js     # 실제 API + 검색바 + 무드필터 + 2컬럼 그리드
│   ├── GalleryScreen.js
│   ├── PhotoDetailScreen.js # 댓글/대댓글 + 좋아요/저장 (API 수정)
│   ├── PhotoFormScreen.js   # expo-image-picker 갤러리/카메라 + 파일업로드
│   ├── ProfileScreen.js     # bio/location/specialties/아바타업로드/통계
│   ├── SeriesScreen.js      # 시리즈 목록 + 펼치기/사진 그리드 (NEW)
│   └── FeedScreen.js        # 팔로우 피드 + 무한스크롤 (NEW)
├── services/     # API 호출 (api.js — photoApi/followApi/commentApi/seriesApi re-export)
├── src/
│   ├── api/
│   │   ├── apiClient.js     # Axios + JWT 자동 첨부 + 토큰 재발급
│   │   ├── photoApi.js      # getAll/search/getFeed/uploadFile 추가
│   │   ├── followApi.js     # follow/unfollow/check/count/list (NEW)
│   │   ├── commentApi.js    # getComments/addComment/deleteComment (NEW)
│   │   └── seriesApi.js     # getByMember/getOne/CRUD (NEW)
│   ├── navigation/
│   │   └── AppNavigator.js  # BottomTabNavigator(탐색/갤러리/등록/피드/프로필) + Stack
│   ├── storage/secureStorage.js
│   └── store/authStore.js
├── store/
│   └── AuthContext.js       # useAuth() 인터페이스 (SecureStore 기반)
└── utils/
    └── uploadImage.js
```

**규칙:**
- 화면(페이지) 단위 컴포넌트 → `screens/`
- 여러 화면에서 쓰는 UI 조각 → `components/`
- API 호출은 반드시 `services/api.js` 또는 `src/api/` 경유
- 색상·간격 하드코딩 금지 → `constants/colors.js`, `constants/layout.js` 상수 사용
- 상태 로직 재사용 → `hooks/`에 커스텀 훅으로 분리
- 이미지 선택: `expo-image-picker` (갤러리/카메라), 업로드: `POST /api/upload/image`

**네비게이션 구조 (AppNavigator.js):**
```
Root Stack
 ├── [미인증] AuthStack: Login → SignUp
 └── [인증] MainStack
      ├── Main (BottomTabNavigator)
      │    ├── ExploreTab   — 탐색 (🔍)
      │    ├── GalleryTab   — 갤러리 (🖼️)
      │    ├── PhotoFormTab — 등록 (＋, 원형 강조)
      │    ├── FeedTab      — 피드 (📰)
      │    └── ProfileTab   — 프로필 (👤)
      ├── PhotoDetail — 사진 상세 (modal, headerShown:false)
      ├── PhotoForm   — 사진 등록/수정 (Stack)
      └── Series      — 시리즈 (Stack)
```

**주요 의존성 (mobile/package.json):**
```
expo: ~49.0.14
expo-image-picker: ~14.3.2      # 갤러리/카메라 이미지 선택
expo-file-system: ~15.4.5       # 파일 시스템 접근
@react-navigation/bottom-tabs: ^6.5.20  # 하단 탭 네비게이션
react-dom / react-native-web    # 웹 export 지원
```

API base URL:
- Android 에뮬레이터: `http://10.0.2.2:8080`
- iOS 시뮬레이터: `http://localhost:8080`
- 운영: `https://api.example.com`

### Docker

**로컬 개발** (`docker-compose.yml`): backend + redis  
**운영 배포** (`backend/Dockerfile`): 멀티스테이지 빌드 (JDK 21 빌드 → JRE 21 런타임)

```
backend/Dockerfile:
  Stage 1 (builder): eclipse-temurin:21-jdk-alpine → ./gradlew bootJar
  Stage 2 (runtime): eclipse-temurin:21-jre-alpine
    - 전용 유저(appuser) 실행 (root 금지)
    - JVM: -Xms128m -Xmx400m (Railway 512MB 플랜 최적화)
    - HEALTHCHECK: /actuator/health
```

---

## CI/CD (GitHub Actions)

파일: `.github/workflows/deploy.yml`

```
master 브랜치 push 시 자동 실행:
  1. backend-ci   — Gradle 테스트 + bootJar 빌드
  2. frontend-ci  — npm ci + build + test
  3. docker-build — GHCR에 이미지 Push (sha + latest 태그)
  4. deploy-backend  — Railway CLI로 자동 배포
  5. deploy-frontend — Vercel Action으로 자동 배포

PR 시: 1, 2번(CI)만 실행
```

### GitHub Secrets 등록 목록

```
RAILWAY_TOKEN          — Railway Account → Tokens
VERCEL_TOKEN           — Vercel Settings → Tokens
VERCEL_ORG_ID          — Vercel Settings → General
VERCEL_PROJECT_ID      — Vercel Project → Settings
REACT_APP_API_URL      — https://api.example.com
REACT_APP_SUPABASE_URL — Supabase Project URL
REACT_APP_SUPABASE_ANON_KEY — Supabase anon key
```

---

## DNS 설정 (Cloudflare)

```
Cloudflare DNS 레코드 (Proxy ON):
  app  CNAME  cname.vercel-dns.com     ← React SPA
  api  CNAME  xxx.railway.app          ← Spring Boot
  @    CNAME  cname.vercel-dns.com     ← apex 도메인
  www  CNAME  app.example.com

SSL/TLS: Full (strict) 모드
HTTPS: Always Use HTTPS ON
```

---

## Supabase 설정

```
1. supabase.com → New Project (Region: Northeast Asia)
2. Settings → API → 키 복사
3. Storage → Bucket 생성: images (Public ON)
4. Storage → Policies:
   - SELECT: 전체 공개
   - INSERT: authenticated 유저만
5. Settings → Database → URI 복사 → DATABASE_URL
```

---

## Mobile 앱스토어 심사 준수 가이드

React Native(Expo) 코드가 App Store / Google Play 심사를 통과하기 위한 필수 체크리스트입니다.

### app.json 현재 설정 (mobile/app.json)

```json
{
  "expo": {
    "name": "Happiness",
    "slug": "happiness-gallery",
    "version": "1.0.0",
    "orientation": "portrait",
    "privacy": "public",
    "sdkVersion": "49.0.0",
    "platforms": ["ios", "android", "web"],
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "backgroundColor": "#0a0a18" },
    "ios": {
      "bundleIdentifier": "com.happiness.gallery",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "프로필 사진 선택 및 사진 등록을 위해 사진 라이브러리에 접근합니다.",
        "NSCameraUsageDescription": "사진 촬영을 위해 카메라에 접근합니다.",
        "NSPhotoLibraryAddUsageDescription": "편집한 사진을 사진 라이브러리에 저장합니다."
      }
    },
    "android": {
      "package": "com.happiness.gallery",
      "versionCode": 1,
      "permissions": ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "CAMERA"]
    },
    "web": { "favicon": "./assets/favicon.png", "bundler": "metro" }
  }
}
```

**배포 전 필수:** `assets/icon.png` 1024×1024px, `assets/splash.png` 실제 이미지로 교체 (현재 placeholder).

### App Store (iOS) 심사 체크리스트

| 항목 | 요구사항 | 현재 상태 |
|------|---------|---------|
| **bundleIdentifier** | 고유 역방향 도메인 | ✅ `com.happiness.gallery` |
| **개인정보처리방침** | 앱 내 접근 가능한 URL 필수 | ✅ LegalScreen — LoginScreen/SignUpScreen/ProfileScreen 링크 완료 |
| **이용약관** | 회원가입 시 동의 절차 | ✅ SignUpScreen termsAgreed 체크박스 + 링크 완료 |
| **카메라 권한** | NSCameraUsageDescription 명시 | ✅ app.json 설정 완료 |
| **사진 라이브러리 권한** | NSPhotoLibraryUsageDescription 명시 | ✅ app.json 설정 완료 |
| **사용자 데이터** | 수집 항목 명시 | ⚠️ App Store Connect "App Privacy" 섹션 수동 작성 필요 |
| **연령 등급** | 콘텐츠 등급 설정 | ⚠️ App Store Connect에서 "4+" 수동 선택 필요 |
| **스크린샷** | 기기별 최소 3장 | ⚠️ 6.5", 5.5" iPhone, 12.9" iPad 수동 캡처 필요 |
| **앱 아이콘** | 1024×1024px PNG (알파 없음) | ⚠️ `assets/icon.png` 실제 아이콘으로 교체 필요 |
| **스플래시 스크린** | 로딩 화면 | ⚠️ `assets/splash.png` 실제 이미지로 교체 필요 |

### Google Play 심사 체크리스트

| 항목 | 요구사항 | 현재 상태 |
|------|---------|---------|
| **package** | 고유 패키지명 | ✅ `com.happiness.gallery` |
| **데이터 안전** | 수집 데이터 선언 | ⚠️ Play Console "데이터 안전" 섹션 수동 작성 필요 |
| **개인정보처리방침** | 공개 URL 필수 | ✅ 앱 내 LegalScreen 포함 / ⚠️ Play Console URL 등록 필요 |
| **CAMERA 권한** | 실제로 사용하는 권한만 선언 | ✅ PhotoFormScreen 카메라 촬영에 사용 |
| **STORAGE 권한** | READ/WRITE 선언 | ✅ 갤러리 이미지 선택에 사용 |
| **타겟 API 레벨** | Android 14(API 34) 이상 | ✅ `compileSdkVersion 34`, `targetSdkVersion 34` 설정 완료 |
| **콘텐츠 등급** | 설문 후 자동 부여 | ⚠️ Play Console 콘텐츠 등급 설문 수동 완료 필요 |

### 코딩 규칙 (심사 통과 유지)

- **실제 기능 구현**: 테스트 계정, 더미 버튼, 빈 화면 등 미완성 UI 금지
- **개인정보 최소 수집**: 이메일, 이름 외 불필요한 데이터 수집 금지
- **권한 최소화**: 실제로 필요한 권한만 선언 (현재 카메라·사진 라이브러리)
- **오류 처리**: 모든 API 호출에 사용자 친화적 오류 메시지 제공
- **로딩 상태**: 비동기 작업 중 반드시 ActivityIndicator 표시
- **오프라인 대응**: 네트워크 없을 때 앱이 크래시되지 않도록 try-catch 처리
- **LegalScreen**: `screens/LegalScreen.js` — 개인정보처리방침·이용약관 탭 UI. LoginScreen/SignUpScreen/ProfileScreen에서 링크됨
- **약관 동의**: SignUpScreen에서 termsAgreed 체크박스 필수. 미동의 시 가입 차단

### 배포 전 필수 작업

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # App Store용 IPA
eas build --platform android  # Google Play용 AAB
```

---

## 기능 구현 테스트 규칙

**모든 기능 구현은 아래 테스트를 통과한 후 커밋한다.**

### 백엔드 테스트

```bash
cd backend
./gradlew clean build -x test          # BUILD SUCCESSFUL 확인
./gradlew test                         # BUILD SUCCESSFUL 확인

# 서버 실행 후 스모크 테스트
./gradlew bootRun &
curl -s http://localhost:8080/actuator/health
curl -s http://localhost:8080/api/photos | python3 -m json.tool
```

### 프론트엔드 테스트

```bash
cd frontend
npm run build    # "Compiled successfully." 확인
npm test -- --watchAll=false

# 수동 테스트 체크리스트:
#   - 로그인/회원가입 정상 동작
#   - 사진 등록 (파일 업로드): ImageUploader 드래그&드롭, 진행률, 미리보기
#   - 사진 등록 (URL 모드): URL 입력 후 미리보기 표시
#   - 갤러리: 사진 그리드 정상 렌더링
```

### 모바일 테스트

```bash
cd mobile
npm install --legacy-peer-deps
npx expo export --platform web 2>&1 | grep -E "Finished|Error"
# "Finished saving JS Bundles" 확인 (아이콘 CRC 경고는 무시 가능)

# 수동 테스트 체크리스트 (에뮬레이터/실기기):
#   - 로그인/회원가입 정상 동작
#   - 탐색 탭: API 사진 로드 + 검색 + 무드 필터
#   - 피드 탭: 팔로우 유저 사진 로드 + 무한스크롤
#   - 등록 탭: 갤러리/카메라 이미지 선택 → 업로드 → 등록
#   - 프로필 탭: 아바타 변경 + bio/location/specialties 저장
#   - 사진 상세: 좋아요/저장 + 댓글/대댓글 작성/삭제
#   - 시리즈: 목록 로드 + 사진 펼치기/접기
```

### 이미지 보정 기능 테스트 체크리스트

| 항목 | 테스트 방법 | 통과 기준 |
|------|------------|----------|
| 파일 업로드 탭 표시 | PhotoFormPage 접속 | "📁 파일 업로드" / "🔗 URL 입력" 탭 표시 |
| 이미지 선택 | 파일 업로드 탭 → 이미지 선택 | 캔버스 프리뷰 + 보정 패널 표시 |
| 노출 슬라이더 | 슬라이더 조작 | 프리뷰 밝기 실시간 변경 |
| 대비 슬라이더 | 슬라이더 조작 | 프리뷰 대비 실시간 변경 |
| 화이트 밸런스(A1) | 온도/색조 슬라이더 | 색온도 실시간 변경 |
| 바이브런스/채도(A2) | 색상 섹션 슬라이더 | 채도 실시간 변경 |
| HSL 패널(A3) | 색조 선택 섹션 → 색상별 슬라이더 | 특정 색상 범위만 선택적 변경 |
| 색 보정(B1) | 색 보정 섹션 → 존별 색조/채도 | 섀도/미드/하이라이트 색 오버레이 |
| 선명도(C1) | 선명도 섹션 슬라이더 | 엣지 선명도 변경 |
| 노이즈 제거(C2) | 노이즈 제거 섹션 | 노이즈 감소 |
| 전/후 비교(D1) | "◧ 전/후 비교" 버튼 → 드래그 | 분리선 이동으로 원본/보정 비교 |
| 클리핑 경고(D2) | "◈ 클리핑 확인" 버튼 | 과노출=빨강, 언더=파랑 오버레이 |
| 프리셋 저장(D3) | 프리셋 섹션 → "+ 저장" | 최대 20개 저장, 더블클릭 이름 수정 |
| 프리셋 내보내기 | 내보내기 버튼 | happiness-presets.json 다운로드 |
| 프리셋 불러오기 | 불러오기 → JSON 선택 | 기존 프리셋에 병합 |
| 내장 스타일 | 기본 스타일 프리셋 펼치기 | 8종 원클릭 적용 |
| 곡선 — 제어점 추가 | 캔버스 클릭 | 새 제어점 추가됨 |
| 곡선 — 제어점 이동 | 제어점 드래그 | 커브 모양 변경됨 |
| 전체 초기화 | 보정 후 "전체 초기화" 클릭 | 모든 값 기본값으로 리셋 |
| 등록하기 | 보정 후 폼 제출 | 보정된 이미지로 업로드 성공 |

#### 보정 엔진 아키텍처 (useImageAdjustments.js)

```
파이프라인 순서 (applyEffects):
  1. buildChannelLUTs  — exposure/contrast/whites/blacks/shadows/highlights + 온도/색조(A1)
  2. renderWithChannelLUTs — LUT 적용 (픽셀 루프)
  3. applyVibranceSaturation — 바이브런스/채도(A2), 픽셀별 HSL 변환
  4. applyHSLAdjustments — HSL 패널(A3), 8색상 가우시안-코사인 가중치
  5. applyColorGrading — 색 보정(B1), 존별 HSV 컬러 오버레이
  6. applySharpening — 선명도(C1), 언샵마스크 + 엣지 마스킹
  7. applyNoiseReduction — 노이즈 제거(C2), 크로마 블러 + 루마 블러
  8. applyUnsharpMask(texture/clarity) + applyDehaze + applyVignette + applyGrain
```

새 exports:
- `DEFAULT_HSL_ADJUSTMENTS` — 8색상 { hue, saturation, luminance }
- `DEFAULT_COLOR_GRADING` — shadows/midtones/highlights { hue, saturation } + blending
- `DEFAULT_SHARPENING` — { amount, radius, detail }
- `DEFAULT_NOISE_REDUCTION` — { luminance, color }
- `applyHSLAdjustments(canvas, hslAdj)`
- `applyColorGrading(canvas, colorGrading)`
- `applySharpening(canvas, sharpening)`
- `applyNoiseReduction(canvas, noiseReduction)`
- `renderClippingOverlay(overlayCanvas, processedCanvas, threshold)` — 클리핑 경고 오버레이
- `DEFAULT_EFFECTS` — vibrance, saturation 추가됨
- `DEFAULT_ADJUSTMENTS` — temperature, tint 추가됨

ImageAdjustmentPanel: 모든 섹션을 아코디언으로, 변경 있을 때 ● 뱃지 표시
PresetManager: MAX 5→20, 내보내기/불러오기(JSON), 내장 스타일 8종 (Fuji Velvia, Kodak Portra, Matte Fade, B&W Dramatic, Golden Hour, Cool Cinematic, Pastel Dream, Vibrant Pop)

### Java 25 연결 확인

```bash
cd backend
java -version           # openjdk 25.x.x 확인
./gradlew -version      # Gradle 9.5.0 확인
./gradlew clean build -x test  # BUILD SUCCESSFUL (Java 25 툴체인으로 컴파일)
```

`build.gradle`의 툴체인 설정:
```groovy
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}
```

---

## 보안 체크리스트

- `.env.local` / 시크릿 파일 절대 커밋 금지
- `SUPABASE_SERVICE_ROLE_KEY`는 백엔드 서버만 사용 (프론트/모바일 노출 금지)
- `JWT_SECRET`은 최소 256비트 (`openssl rand -base64 64`)
- CORS `allowed-origins`에 와일드카드(`*`) 금지 — 정확한 도메인만 나열
- 파일 업로드: MIME 타입 + 크기 검증 필수 (`SupabaseStorageService.validateFile`)
- 운영 DB `ddl-auto: validate` 고정 (절대 `create`/`create-drop` 금지)
- Rate Limiting: Bucket4j IP 기준 100req/60s (`ApiAccessInterceptor`)
