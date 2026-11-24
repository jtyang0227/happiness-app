# apps/admin — 어드민 웹 (Next.js)

happiness-admin 저장소의 `frontend/`(CRA)를 옮긴 것. `apps/web`과 같은 방식 — Next.js 16 Pages Router + 정적 내보내기(`out/`),
화면은 기존 React Router 앱이 브라우저에서 그린다(`pages/[[...slug]].tsx`, `ssr: false`). API는 `apps/api`의 어드민 진입점(`node dist/admin-main.js`, 기본 8091).

```bash
npm ci
REACT_APP_API_URL=http://localhost:8091/api npm run build   # out/
npm start                                                    # out/을 3001에서 SPA로
npm run dev                                                  # 개발 서버 3001
```

- **빌드는 webpack(`next build --webpack`)** — 기본 Turbopack은 `index.html`에 인라인 `<script>`를 넣어 `vercel.json`의 CSP(`script-src 'self'`)에 막힌다.
- **CSS는 `pages/_app.tsx`에서만** — Pages Router는 전역 CSS를 컴포넌트에서 import할 수 없다. CRA 번들과 같은 순서(index부터 깊이 우선 import 순서)로 모아 두었다. 컴포넌트에 CSS를 새로 만들면 `_app.tsx`에 그 컴포넌트가 처음 불리는 자리 순서대로 추가한다.
- `#__next`에 `width/height: 100%`(`src/styles/next-shell.css`) — CRA의 `html, body, #root { height: 100% }` 체인을 유지.
- 로고는 `public/assets/logo.png`(CRA의 이미지 import 대신 정적 경로).
- 환경 변수: `REACT_APP_API_URL`(이름 그대로, 빌드 때 `next.config.mjs`가 넣는다).
- 배포: `vercel.json`(SPA 폴백 + 보안 헤더) 그대로. Vercel 프로젝트의 Root Directory를 `apps/admin`, 출력 `out`으로(컷오버 11단계).
- 확인(2026-11-24): CRA 빌드와 31개 화면 × 390/1280 = 62장 픽셀 동일(Nest 어드민 API, 고정 시각, 경로마다 교대로 촬영).
