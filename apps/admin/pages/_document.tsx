import { Head, Html, Main, NextScript } from 'next/document';

/** CRA public/index.html의 head와 같은 내용(Pretendard 웹폰트 포함) */
export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta name="theme-color" content="#3182F6" />
        <meta name="description" content="hapis Admin Dashboard" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" crossOrigin="" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
      </Head>
      <body>
        <noscript>이 애플리케이션을 실행하려면 JavaScript를 활성화해야 합니다.</noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
