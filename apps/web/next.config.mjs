/**
 * CRA(frontend/)를 그대로 옮긴 Next.js — Pages Router + 정적 내보내기(out/).
 * 화면은 React Router가 브라우저에서 그린다(pages/[[...slug]].tsx). 호스팅은 지금처럼 정적 + SPA 폴백(public/_redirects).
 * CRA 코드의 process.env.REACT_APP_* 를 그대로 쓰도록 빌드 때 값을 넣는다(.env.production/.env.development는 Next가 읽는다).
 */
const reactAppEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_')));

export default {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: false,
  images: { unoptimized: true },
  env: reactAppEnv,
};
