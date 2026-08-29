import React from 'react';

/*
 * Toss 플랫 디자인 — 브랜드 마크. RGB 글리치 등 장식 애니메이션 없이 정적으로 렌더링한다.
 */
export default function Logo({ variant = 'white', size = 28, imgStyle }) {
  const src = variant === 'black' ? '/brand/logo-mark-black.png' : '/brand/logo-mark-white.png';
  return (
    <img
      src={src}
      alt="Happiness 로고"
      style={{ height: size, width: 'auto', display: 'block', ...imgStyle }}
    />
  );
}
