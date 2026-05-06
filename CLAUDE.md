# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```
H2 console available at `http://localhost:8080/h2-console` in dev. Production profile uses PostgreSQL (`--spring.profiles.active=prod`).

### Frontend
```bash
cd frontend
npm install
npm start    # Dev server on port 3000
npm test
npm run build
```

### Mobile
```bash
cd mobile
npm install
npm start        # Expo dev server
npm run ios      # iOS simulator
npm run android  # Android emulator (uses 10.0.2.2:8080, not localhost)
```

---

## Architecture

### Backend (`com.happiness.app`)

Feature-based package layout:

- **photo/** — Core domain. `PhotoController` exposes REST endpoints for CRUD plus likes/saves/shares/tags. Entities: `Photo`, `PhotoLike`, `PhotoSave`, `PhotoShare`, `PhotoTag`.
- **member/** — Auth & users. `AuthController` handles signup/login. `KakaoOAuthService` handles Kakao OAuth. `SecurityConfig` (in `config/`) configures Spring Security.
- **common/** — `HelloController` (health check), `ImageProcessingUtil` (upload + Thumbnailator resize).
- **board/** — Placeholder; `Board`/`Content` entities with repositories, no service layer yet.

Dev uses H2 in-memory (schema auto-created/dropped on restart). Production config (`application-prod.properties`) switches to PostgreSQL, adds JWT placeholders, AWS S3, and OAuth2 for Google/Naver/Kakao via environment variables.

### Frontend (`src/`)

- **pages/** — Route-level components (Login, SignUp, Gallery, Explore, List, PhotoDetail, PhotoForm, Profile)
- **components/layout/Header** — 상단 네비게이션 (탐색·갤러리·목록·등록·프로필 탭 + 로그아웃)
- **components/common/** — Toast, GridSpanPicker (12-컬럼 너비 선택)
- **components/photo/PhotoCard** — 이미지 카드 (색체학 무드 뱃지 포함)
- **contexts/AuthContext** — 전역 인증 상태 (login/signup/updateProfile/logout + localStorage)
- **hooks/usePhotos** — 사진 CRUD + 상태 관리
- **hooks/useToast** — 토스트 알림 훅
- **services/api.js** — photoApi + authApi (fetch wrapper)
- **services/mockData.js** — 탐색 화면용 목 데이터

Routing via React Router DOM v6. No Redux — state managed through Context + local state.

**갤러리 12-컬럼 그리드**: `packRows()` 알고리즘으로 `gridColSpan` 합이 12가 되도록 사진을 행으로 묶어 CSS flexbox로 렌더링. 각 사진은 `flex: gridColSpan` 비율로 너비 배분.

### Mobile (`mobile/`)

**폴더 구조 규칙:**
```
mobile/
├── assets/       # 이미지, 폰트 등 정적 리소스
├── components/   # 재사용 가능한 공통 UI 컴포넌트 (Toast, Header, TabBar, PostCard, PhotoCard)
├── constants/    # 색상·여백·폰트 상수 (colors.js, layout.js)
├── hooks/        # 커스텀 훅 (usePhotos, useToast)
├── navigation/   # 라우팅 설정 (AppNavigator)
├── screens/      # 페이지 단위 컴포넌트 (Login, Explore, Gallery, List, Detail, Form)
├── services/     # API 호출·외부 연동 (api.js, mockData.js)
├── store/        # 상태 관리 (AuthContext)
└── utils/        # 유틸 함수
```

**규칙:**
- 화면(페이지) 단위 컴포넌트 → `screens/`
- 여러 화면에서 쓰는 UI 조각 → `components/`
- API 호출은 반드시 `services/api.js`의 `photoApi`를 경유
- 색상·간격 하드코딩 금지 → `constants/colors.js`, `constants/layout.js` 상수 사용
- 상태 로직 재사용 → `hooks/`에 커스텀 훅으로 분리

`AppNavigator`가 화면 전환 상태를 소유하고 각 Screen에 콜백을 props로 전달합니다. API calls go directly to the Spring Boot backend; Android emulator uses `10.0.2.2:8080` while iOS uses `localhost:8080`.

### Docker

`backend/Dockerfile` is a two-stage build: JDK 22 Alpine for the Gradle build, JRE 22 Alpine for the runtime image. Health check hits `/actuator/health`.

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
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
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
| **외부 링크** | 앱 내 Safari 결제 유도 금지 | In-App Purchase 미사용 시 해당 없음 |

### Google Play 심사 체크리스트

| 항목 | 요구사항 | 적용 방법 |
|------|---------|---------|
| **데이터 안전** | 수집 데이터 선언 | Play Console "데이터 안전" 섹션 작성 |
| **개인정보처리방침** | 공개 URL 필수 | 앱 내 + Play Console에 URL 등록 |
| **권한 사용 설명** | 실제로 사용하는 권한만 선언 | `READ_EXTERNAL_STORAGE` 등 최소화 |
| **타겟 API 레벨** | Android 14(API 34) 이상 | `compileSdkVersion 34` 설정 |
| **콘텐츠 등급** | 설문 후 자동 부여 | Play Console 콘텐츠 등급 설문 완료 |
| **스크린샷** | 최소 2장, 최대 8장 | 폰 + 태블릿 각각 |

### 코딩 규칙 (심사 통과 유지)

- **실제 기능 구현**: 테스트 계정, 더미 버튼, 빈 화면 등 미완성 UI 금지
- **개인정보 최소 수집**: 이메일, 이름 외 불필요한 데이터 수집 금지
- **권한 최소화**: 실제로 필요한 권한만 선언 (현재 카메라·사진 라이브러리)
- **오류 처리**: 모든 API 호출에 사용자 친화적 오류 메시지 제공
- **로딩 상태**: 비동기 작업 중 반드시 ActivityIndicator 표시
- **오프라인 대응**: 네트워크 없을 때 앱이 크래시되지 않도록 try-catch 처리
- **딥링크 미사용**: 외부 URL로 유도하는 기능 없음 (현재 적합)
- **광고 미포함**: IDFA 수집 코드 없음 (현재 적합)

### 배포 전 필수 작업

```bash
# EAS 빌드 (권장)
npm install -g eas-cli
eas login
eas build --platform ios     # App Store용 IPA
eas build --platform android # Google Play용 AAB

# 로컬 빌드 (Expo Go 아닌 스탠드얼론)
expo build:ios      # deprecated → eas build 사용 권장
expo build:android  # deprecated → eas build 사용 권장
```

### 개인정보처리방침 URL 등록 위치

앱 배포 전 개인정보처리방침 페이지를 웹에 게시하고 다음 위치에 등록:
1. App Store Connect → 앱 정보 → 개인정보처리방침 URL
2. Google Play Console → 스토어 등록정보 → 개인정보처리방침
3. 앱 내 로그인 화면 하단 + 프로필 화면
