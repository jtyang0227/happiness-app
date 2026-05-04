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

- **pages/** — Route-level components (`HomePage`, `NotFoundPage`)
- **components/** — `layout/Header`, `common/` (Button, Card, Modal, Toast), `posts/PostCard`
- **contexts/AuthContext** — Global auth state via React Context
- **hooks/useFetchAPI** — Generic data-fetching hook
- **utils/api.js** — Fetch wrapper (base URL, headers, error handling)
- **data/mockData.js** — Dev-time mock data

Routing via React Router DOM v6. No Redux — state managed through Context + local state.

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
