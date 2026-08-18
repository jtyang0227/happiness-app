import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

/* ── 도트 패턴 사전 계산 (모듈 로드 시 1회) ── */
const COLS = 15;
const ROWS = 11;
const SPACING = 14;
const CX = (COLS - 1) * SPACING / 2;   // 98
const CY = (ROWS - 1) * SPACING / 2;   // 70
const MAX_DIST = Math.sqrt(CX * CX + CY * CY); // ≈ 120
const SVG_W = (COLS - 1) * SPACING;    // 196
const SVG_H = (ROWS - 1) * SPACING;    // 140

const DOTS = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = c * SPACING;
    const y = r * SPACING;
    const dist = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2);
    // 중앙: opacity 1, 외곽: opacity 0.04 (방사형 페이드)
    const opacity = Math.max(0.04, 1 - (dist / MAX_DIST) * 0.96);
    // 체커보드 패턴으로 primary / accent 교대
    const isPrimary = (r + c) % 2 === 0;
    DOTS.push({ x, y, opacity, isPrimary });
  }
}

/* ─────────────────────────────────────────────────────── */
/**
 * DotEmptyState — 도트 컨셉 빈 상태 컴포넌트
 *
 * Props:
 *   icon        {string}   이모지 아이콘 (기본: '✦')
 *   title       {string}   안내 제목
 *   description {string?}  보조 설명
 *   actionLabel {string?}  CTA 버튼 레이블
 *   onAction    {fn?}      CTA 클릭 핸들러
 *   theme       {'dark'|'light'}  배경 테마 (기본: 'dark')
 *   style       {object?}  추가 컨테이너 스타일
 */
export default function DotEmptyState({
  icon = '✦',
  title,
  description,
  actionLabel,
  onAction,
  theme = 'dark',
  style: extraStyle,
}) {
  const [btnHovered, setBtnHovered] = useState(false);
  const isDark = theme === 'dark';

  /* 테마별 색상 */
  const titleColor = isDark ? 'rgba(255,255,255,0.88)' : COLORS.text;
  const descColor  = isDark ? 'rgba(255,255,255,0.45)' : COLORS.textMuted;
  const svgOpacity = isDark ? 1 : 0.35;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 280,
        ...extraStyle,
      }}
    >
      {/* ── 도트 패턴 배경 (SVG, 수평수직 중앙 절대 위치) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: svgOpacity,
        }}
      >
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        >
          {DOTS.map(({ x, y, opacity, isPrimary }, i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.25}
              fill={isPrimary ? COLORS.primary : COLORS.accent}
              opacity={opacity}
            />
          ))}
        </svg>
      </div>

      {/* ── 콘텐츠 (도트 위, z-index 1) ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* 이모지 아이콘 */}
        <div
          style={{
            fontSize: 48,
            lineHeight: 1,
            marginBottom: 18,
            filter: isDark ? 'drop-shadow(0 0 12px rgba(91,110,245,0.30))' : 'none',
          }}
        >
          {icon}
        </div>

        {/* 제목 */}
        {title && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: titleColor,
              marginBottom: description ? 8 : 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </div>
        )}

        {/* 설명 */}
        {description && (
          <div
            style={{
              fontSize: 13,
              color: descColor,
              lineHeight: 1.65,
              maxWidth: 280,
              margin: '0 auto',
            }}
          >
            {description}
          </div>
        )}

        {/* CTA 버튼 */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: btnHovered ? COLORS.primaryDark : COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: btnHovered ? 'translateY(-1px)' : 'translateY(0)',
              boxShadow: btnHovered
                ? '0 6px 20px rgba(91,110,245,0.50)'
                : '0 2px 10px rgba(91,110,245,0.30)',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
