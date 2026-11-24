import { Head, Html, Main, NextScript } from 'next/document';

/** CRA public/index.html의 head와 같은 내용 */
export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta name="theme-color" content="#ffffff" />
        <meta name="description" content="Happiness — 포트폴리오 갤러리" />
        <link rel="icon" href="/brand/logo-mark-black.png" />
      </Head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
