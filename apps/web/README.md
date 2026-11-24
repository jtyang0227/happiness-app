# apps/web — Happiness 웹 (Next.js + TypeScript)

`frontend/`(CRA)를 옮긴 것. **화면 코드는 그대로**이고 껍데기만 Next.js다 — 컷오버(작업 큐 11) 전까지 운영 배포는 `frontend/`가 한다.

- Next.js 16 **Pages Router + React 18** — App Router는 React 19를 함께 쓰게 돼 화면 회귀 위험이 커서 피했다.
- `pages/[[...slug]].tsx` 하나가 모든 주소를 받아 기존 React Router 앱(`src/App.tsx`)을 브라우저에서만 그린다(`ssr: false`).
- `output: 'export'` → `out/`에 정적 파일. 호스팅은 지금처럼 정적 + SPA 폴백(`public/_redirects`, `_headers` 그대로).
- 환경 변수는 CRA 이름 그대로 `REACT_APP_*`(`.env.production`·`.env.development`) — `next.config.mjs`가 빌드 때 넣는다.
- TypeScript는 `strict: false`로 시작(전환 1단계). 컴포넌트 props는 코드모드로 선택 속성 타입을 붙였고, 이후 화면을 고칠 때 점점 좁힌다.

## 명령
```bash
npm install
npm run dev        # http://localhost:3000 (API는 .env.development의 REACT_APP_API_URL)
npm run typecheck  # tsc --noEmit — 0이어야 한다
npm test           # vitest(jsdom)
npm run build      # out/
```

## 회귀 확인(2026-11-24)
CRA 빌드와 이 빌드를 같은 API(로컬 Nest)에 붙여 23개 화면 × 390/1280을 Playwright로 찍어 픽셀 비교 — 46장 모두 같음(둘러보기 사진 탭은 무한 스크롤이 전체 캡처 중 다음 페이지를 불러와 보이는 영역만 비교, 스크롤마다 30장씩 늘어나는 동작은 따로 확인).
첫 화면에서 두 번째 페이지를 바로 불러오는지는 두 빌드 모두 경쟁 상태(그때그때 30 또는 60)라 기존 동작 그대로다.

## 타입 전환 중 발견한 것(동작은 바꾸지 않음)
- `services/api.ts` — `photoApi.getGenreStats`가 같은 내용으로 두 번 정의돼 있었다(뒤의 것 삭제, 동작 같음).
- `components/photo/ImageAdjustmentPanel.tsx` — 버튼 style에 `background`가 두 번(앞의 값은 원래 무시됨, 앞의 것 삭제).
- `pages/PhotoFormPage.tsx` — 어떤 라우트에도 연결되지 않은 옛 화면. `setGenre` 미정의·`GenreSelector`에 없는 props를 `@ts-expect-error`로 표시만 했다.
- `constants/colors.ts` `GENRE_META`에 `bg`가 없는데 장르 선택·어드민 화면이 `bg`를 읽는다(배경 없음으로 그려짐).
