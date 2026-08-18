import React, { useRef, useId } from 'react';

/* ── @keyframes 1회 DOM 주입 (중복 방지) ── */
(function injectKeyframesOnce() {
  const STYLE_ID = 'dot-skeleton-keyframes';
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dotSkeletonPulse {
      0%, 100% { opacity: 0.55; }
      50%       { opacity: 1;    }
    }
  `;
  document.head.appendChild(el);
}());

/* ─────────────────────────────────────────────────────── */
/**
 * DotSkeletonCard — 도트 격자 패턴 로딩 스켈레톤
 *
 * PhotoCard 마소닉 자리를 대체한다. 고정 크기 도트 격자(10px 간격)에
 * dotSkeletonPulse shimmer 애니메이션을 적용한다.
 *
 * Props:
 *   height  {number?}  카드 높이(px). 미지정 시 마운트 시 160~280 랜덤 고정.
 */
export default function DotSkeletonCard({ height }) {
  /* 마운트 시 1회만 결정 — key가 동일하면 리렌더 후에도 동일한 높이 유지 */
  const heightRef = useRef(
    height != null ? height : Math.floor(Math.random() * 120) + 160,
  );
  // 여러 인스턴스가 동시에 렌더될 때 SVG pattern id가 문서 내에서 중복되지 않도록 고유화
  const patternId = `dotSkeletonPattern-${useId()}`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: heightRef.current,
        background: '#0f0f0f',
        borderRadius: 0,
        overflow: 'hidden',
        animation: 'dotSkeletonPulse 1.8s ease-in-out infinite',
      }}
      aria-hidden="true"
    >
      {/* 도트 격자 — SVG <pattern> 으로 퍼포먼스 최적화 */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/*
           * 10×10 격자 단위에 circle(cx=5,cy=5,r=1) 1개 → 전체 면적에 도트 반복
           * id는 인스턴스마다 useId()로 고유화되어 문서 내 중복을 피함
           */}
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="11"
            height="11"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="5.5" cy="5.5" r="1.4" fill="rgba(255,255,255,0.18)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
