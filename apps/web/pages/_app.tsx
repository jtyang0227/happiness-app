import type { AppProps } from 'next/app';
import '../src/styles/global.css';

export default function HappinessApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
