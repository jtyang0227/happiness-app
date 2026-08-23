import React from 'react';

/*
 * AKIRA 로고 진입 글리치 — 최초 마운트 시 1회성 RGB 채널 분리 효과 후 정착한다.
 * (DESIGN_PROMPTS/planning/PLANNING_akira-logo-motion.md AC3/AC5/AC6)
 */
export default function AkiraLogo({ variant = 'white', size = 28, imgStyle }) {
  const src = variant === 'black' ? '/brand/logo-mark-black.png' : '/brand/logo-mark-white.png';
  return (
    <>
      <style>{`
        @keyframes akiraLogoGlitch {
          0%   { filter: drop-shadow(-3px 0 0 rgba(232,18,26,0.9)) drop-shadow(3px 0 0 rgba(34,211,238,0.9)); opacity: 0.35; transform: translateX(-2px); }
          20%  { filter: drop-shadow(3px 0 0 rgba(232,18,26,0.75)) drop-shadow(-3px 0 0 rgba(34,211,238,0.75)); opacity: 0.9; transform: translateX(2px); }
          40%  { filter: drop-shadow(-2px 0 0 rgba(232,18,26,0.5)) drop-shadow(2px 0 0 rgba(34,211,238,0.5)); opacity: 0.65; transform: translateX(-1px); }
          60%  { filter: drop-shadow(1px 0 0 rgba(232,18,26,0.3)) drop-shadow(-1px 0 0 rgba(34,211,238,0.3)); opacity: 1; transform: translateX(1px); }
          100% { filter: drop-shadow(0 0 0 transparent); opacity: 1; transform: translateX(0); }
        }
        .akira-logo-glitch { animation: akiraLogoGlitch 0.6s steps(2, end) 1 both; }
        @media (prefers-reduced-motion: reduce) {
          .akira-logo-glitch { animation: none !important; filter: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <img
        src={src}
        alt="Happiness 로고"
        className="akira-logo-glitch"
        style={{ height: size, width: 'auto', display: 'block', ...imgStyle }}
      />
    </>
  );
}
