/**
 * happiness-admin frontend(CRA)를 그대로 옮긴 Next.js — Pages Router + 정적 내보내기(out/). apps/web과 같은 방식.
 * 화면은 React Router가 브라우저에서 그린다(pages/[[...slug]].tsx). CRA 코드의 process.env.REACT_APP_* 를 빌드 때 넣는다.
 */
const reactAppEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_')));

export default {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: false,
  images: { unoptimized: true },
  env: reactAppEnv,
};
