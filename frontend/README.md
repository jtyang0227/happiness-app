# Happiness App — Frontend (React)

React 18 SPA. 모바일 앱(React Native)과 동일한 기능을 웹 브라우저에서 제공합니다.

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 16+ |
| npm | 8+ |

## 로컬 실행

```bash
cd frontend
npm install
npm start        # http://localhost:3000 에서 개발 서버 시작
```

백엔드 서버도 함께 실행해야 합니다:

```bash
cd ../backend
./gradlew bootRun   # http://localhost:8080
```

## 빌드

```bash
npm run build
```

`build/` 폴더에 정적 파일이 생성됩니다. Nginx, S3+CloudFront, Vercel 등으로 배포 가능합니다.

### 정적 서버로 빌드 결과 확인

```bash
npm install -g serve
serve -s build -l 3000
```

## 테스트

```bash
npm test           # Jest + React Testing Library
```

## 프로젝트 구조

```
src/
├── App.jsx                    # BrowserRouter + 라우트 정의 + 인증 가드
├── index.js                   # React 18 createRoot 진입점
│
├── contexts/
│   └── AuthContext.jsx         # 전역 인증 상태 (localStorage 유지)
│
├── hooks/
│   ├── usePhotos.js            # 사진 CRUD + 상태 관리
│   └── useToast.js             # 자동 사라지는 토스트 알림
│
├── services/
│   ├── api.js                  # photoApi + authApi (fetch wrapper)
│   └── mockData.js             # 탐색 화면용 목 데이터
│
├── constants/
│   └── colors.js               # COLORS 디자인 토큰 + MOOD_COLORS (색체학 무드)
│
├── components/
│   ├── layout/
│   │   └── Header.jsx          # 상단 네비게이션 (5개 탭 + 로그아웃)
│   ├── common/
│   │   ├── Toast.jsx           # 화면 하단 알림 컴포넌트
│   │   └── GridSpanPicker.jsx  # 12-컬럼 너비 선택기 (4개 프리셋)
│   └── photo/
│       └── PhotoCard.jsx       # 이미지 카드 (색체학 무드 뱃지 포함)
│
└── pages/
    ├── LoginPage.jsx           # Cosmos 다크 테마 로그인
    ├── SignUpPage.jsx          # 회원가입 (이름·이메일·비밀번호·프로필명·인스타)
    ├── GalleryPage.jsx         # 12-컬럼 그리드 갤러리 (packRows 알고리즘)
    ├── ExplorePage.jsx         # 탐색 (목 데이터 2열 그리드)
    ├── ListPage.jsx            # 목록 보기 (썸네일 + 텍스트)
    ├── PhotoDetailPage.jsx     # 상세 (이미지·무드·좋아요·수정·삭제)
    ├── PhotoFormPage.jsx       # 사진 등록/수정 폼 (GridSpanPicker 포함)
    └── ProfilePage.jsx         # 프로필 보기/편집 + 로그아웃
```

## 주요 기능

### 인증
- 이메일/비밀번호 회원가입 · 로그인
- 실시간 이메일 형식 검증 (프론트 + 백엔드 이중 검증)
- 프로필 이름(포트폴리오 서브도메인 슬러그) 중복 검사
- 인스타그램 아이디 `@` 자동 처리
- `localStorage` 세션 유지

### 갤러리 12-컬럼 그리드
사진마다 `gridColSpan` (1–12) 값을 갖습니다. `packRows()` 알고리즘이 합이 12가 되도록 사진을 행으로 묶고, CSS `flex: gridColSpan` 비율로 너비를 배분합니다.

```
예시: [span 4] [span 8]   → 한 행
      [span 6] [span 6]   → 한 행
      [span 12]           → 한 행 (전체 너비)
```

### 색체학 무드 뱃지
사진 업로드 시 백엔드가 이미지 픽셀을 분석하여 `colorMood`(WARM, COOL, NATURAL 등)를 저장합니다. 갤러리 카드 우측 상단에 색상 점 + 한국어 레이블 배지로 표시됩니다.

### GridSpanPicker
12개 클릭 가능한 셀 + 4개 프리셋 버튼(좁게·보통·넓게·전체). 사진 등록 폼에서 갤러리 표시 너비를 시각적으로 선택합니다.

## 라우트

| 경로 | 페이지 | 인증 필요 |
|------|--------|----------|
| `/login` | 로그인 | No |
| `/signup` | 회원가입 | No |
| `/` | 갤러리 | Yes |
| `/explore` | 탐색 | Yes |
| `/list` | 목록 | Yes |
| `/photo/new` | 사진 등록 | Yes |
| `/photo/:id` | 사진 상세 | Yes |
| `/photo/:id/edit` | 사진 수정 | Yes |
| `/profile` | 프로필 | Yes |

미인증 상태에서 보호된 라우트 접근 시 `/login`으로 리다이렉트됩니다.

## 환경 설정

`src/services/api.js`에서 백엔드 URL 변경:

```js
const BASE = 'http://localhost:8080/api';  // 개발
// const BASE = 'https://api.yourdomain.com/api';  // 프로덕션
```

프로덕션 빌드 시 `.env` 파일 사용 권장:

```
REACT_APP_API_BASE=https://api.yourdomain.com/api
```

```js
const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080/api';
```
