import dynamic from 'next/dynamic';
import Head from 'next/head';

/** 모든 주소를 기존 React Router 앱이 처리한다(브라우저에서만 — localStorage·window를 쓰는 코드가 많다) */
const App = dynamic(() => import('../src/App'), { ssr: false });

export default function Spa() {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>hapis Admin</title>
      </Head>
      <div id="root">
        <App />
      </div>
    </>
  );
}

/** 정적 내보내기 — 셸(index.html) 하나만 만들고 나머지 경로는 SPA 폴백(vercel.json rewrites) */
export function getStaticPaths() {
  return { paths: [{ params: { slug: [] } }], fallback: false };
}

export function getStaticProps() {
  return { props: {} };
}
