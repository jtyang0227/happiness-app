# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

---

## Project Overview

Full-stack photo-sharing app with three components:
- **backend/** — Spring Boot 3.4.5 + Java 25, Gradle 9.5
- **frontend/** — React 18 SPA
- **mobile/** — React Native 0.72 + Expo 49

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
```

---

## Architecture

### Backend (`com.happiness.app`)

Feature-based package layout:

- **photo/** — Core domain. `PhotoController` exposes REST endpoints for CRUD plus likes/saves/shares/tags. Entities: `Photo`, `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag`.
- **member/** — Auth & users. `AuthController` handles signup/login. `KakaoOAuthService` handles Kakao OAuth. `SecurityConfig` (in `config/`) configures Spring Security.
- **storage/** — Supabase Storage 연동. `SupabaseStorageService` (WebClient 기반 업로드/삭제), `StorageController` (`POST /api/upload/image`).
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

- **pages/** — Route-level components (Login, SignUp, Gallery, Explore, List, PhotoDetail, PhotoForm, Profile)
- **components/layout/Header** — 상단 네비게이션 (탐색·갤러리·목록·등록·프로필 탭 + 로그아웃)
- **components/common/** — Toast, GridSpanPicker (12-컬럼 너비 선택), **ImageUploader** (드래그&드롭 + 진행률 + 미리보기)
- **components/photo/PhotoCard** — 이미지 카드 (색체학 무드 뱃지 포함)
- **contexts/AuthContext** — 전역 인증 상태 (login/signup/updateProfile/logout + localStorage)
- **hooks/usePhotos** — 사진 CRUD + 상태 관리
- **hooks/useToast** — 토스트 알림 훅
- **services/api.js** — photoApi + authApi (fetch wrapper)
- **services/uploadApi.js** — `uploadImage(file, folder, onProgress)` → Axios multipart 업로드
- **services/mockData.js** — 탐색 화면용 목 데이터

Routing via React Router DOM v6. No Redux — state managed through Context + local state.

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
├── assets/       # 이미지, 폰트 등 정적 리소스
├── components/   # 재사용 가능한 공통 UI 컴포넌트
│   └── ImageUploadButton.js  # expo-image-picker 기반 업로드 버튼
├── constants/    # 색상·여백·폰트 상수 (colors.js, layout.js)
├── hooks/        # 커스텀 훅 (usePhotos, useToast)
├── navigation/   # 라우팅 설정 (AppNavigator)
├── screens/      # 페이지 단위 컴포넌트 (Login, Explore, Gallery, List, Detail, Form)
├── services/     # API 호출·외부 연동 (api.js, mockData.js)
├── store/        # 상태 관리 (AuthContext)
└── utils/
    └── uploadImage.js  # pickImage / takePhoto / uploadImageAsset
```

**규칙:**
- 화면(페이지) 단위 컴포넌트 → `screens/`
- 여러 화면에서 쓰는 UI 조각 → `components/`
- API 호출은 반드시 `services/api.js`의 `photoApi`를 경유
- 색상·간격 하드코딩 금지 → `constants/colors.js`, `constants/layout.js` 상수 사용
- 상태 로직 재사용 → `hooks/`에 커스텀 훅으로 분리

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

### app.json 필수 설정

```json
{
  "expo": {
    "name": "Cosmos — 포트폴리오 갤러리",
    "slug": "cosmos-gallery",
    "version": "1.0.0",
    "orientation": "portrait",
    "privacy": "public",
    "ios": {
      "bundleIdentifier": "com.yourcompany.cosmos",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "프로필 사진 선택 및 사진 등록을 위해 사진 라이브러리에 접근합니다.",
        "NSCameraUsageDescription": "사진 촬영을 위해 카메라에 접근합니다.",
        "NSPhotoLibraryAddUsageDescription": "편집한 사진을 사진 라이브러리에 저장합니다."
      }
    },
    "android": {
      "package": "com.yourcompany.cosmos",
      "versionCode": 1,
      "permissions": ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
    }
  }
}
```

### App Store (iOS) 심사 체크리스트

| 항목 | 요구사항 | 적용 방법 |
|------|---------|---------|
| **개인정보처리방침** | 앱 내 접근 가능한 URL 필수 | 로그인/프로필 화면에 링크 추가 |
| **이용약관** | 회원가입 시 동의 절차 | `SignUpScreen`의 `termsAgreed` 체크박스 |
| **사용자 데이터** | 수집 항목 명시 | App Store Connect "App Privacy" 섹션 작성 |
| **연령 등급** | 콘텐츠 등급 설정 | App Store Connect에서 "4+" 또는 "12+" 선택 |
| **스크린샷** | 기기별 최소 3장 | 6.5", 5.5" iPhone, 12.9" iPad |
| **앱 아이콘** | 1024×1024px PNG (알파 없음) | `assets/icon.png` |
| **스플래시 스크린** | 로딩 화면 | `app.json`의 `splash` 설정 |

### Google Play 심사 체크리스트

| 항목 | 요구사항 | 적용 방법 |
|------|---------|---------|
| **데이터 안전** | 수집 데이터 선언 | Play Console "데이터 안전" 섹션 작성 |
| **개인정보처리방침** | 공개 URL 필수 | 앱 내 + Play Console에 URL 등록 |
| **권한 사용 설명** | 실제로 사용하는 권한만 선언 | `READ_EXTERNAL_STORAGE` 등 최소화 |
| **타겟 API 레벨** | Android 14(API 34) 이상 | `compileSdkVersion 34` 설정 |
| **콘텐츠 등급** | 설문 후 자동 부여 | Play Console 콘텐츠 등급 설문 완료 |

### 코딩 규칙 (심사 통과 유지)

- **실제 기능 구현**: 테스트 계정, 더미 버튼, 빈 화면 등 미완성 UI 금지
- **개인정보 최소 수집**: 이메일, 이름 외 불필요한 데이터 수집 금지
- **권한 최소화**: 실제로 필요한 권한만 선언 (현재 카메라·사진 라이브러리)
- **오류 처리**: 모든 API 호출에 사용자 친화적 오류 메시지 제공
- **로딩 상태**: 비동기 작업 중 반드시 ActivityIndicator 표시
- **오프라인 대응**: 네트워크 없을 때 앱이 크래시되지 않도록 try-catch 처리

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
npm install
npx expo export --platform web 2>&1 | tail -5   # 에러 없음 확인
```

### 이미지 보정 기능 테스트 체크리스트

| 항목 | 테스트 방법 | 통과 기준 |
|------|------------|----------|
| 파일 업로드 탭 표시 | PhotoFormPage 접속 | "📁 파일 업로드" / "🔗 URL 입력" 탭 표시 |
| 이미지 선택 | 파일 업로드 탭 → 이미지 선택 | 캔버스 프리뷰 + 보정 패널 표시 |
| 노출 슬라이더 | 슬라이더 조작 | 프리뷰 밝기 실시간 변경 |
| 대비 슬라이더 | 슬라이더 조작 | 프리뷰 대비 실시간 변경 |
| 곡선 — 제어점 추가 | 캔버스 클릭 | 새 제어점 추가됨 |
| 곡선 — 제어점 이동 | 제어점 드래그 | 커브 모양 변경됨 |
| 초기화 버튼 | 보정 후 초기화 클릭 | 모든 값 기본값으로 리셋 |
| 등록하기 | 보정 후 폼 제출 | 보정된 이미지로 업로드 성공 |

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
