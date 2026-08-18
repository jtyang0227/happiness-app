import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

/* ── 레코드(바이닐) 도트 그루브 사전 계산 (모듈 로드 시 1회) ──
 * 이전 버전(옅은 primary/accent 산포)이 취향이 약하다는 피드백에 따라
 * 보라색 포인트를 걷어내고, 검정×흰색 고대비 "레코드판" 모티프로 교체.
 * 링 형태로 도트를 배치해 바이닐 그루브를 연상시키면서 시각적 존재감을 강화한다.
 */
const DISC_R = 66;          // 레코드판 반지름
const LABEL_R = 22;         // 중앙 라벨(아이콘 배경) 반지름
const RING_COUNT = 6;
const SVG_SIZE = (DISC_R + 6) * 2;
const CENTER = SVG_SIZE / 2;

const RINGS = [];
for (let i = 0; i < RING_COUNT; i++) {
  const t = i / (RING_COUNT - 1);                       // 0(바깥) → 1(안쪽)
  const radius = DISC_R - 8 - t * (DISC_R - 8 - LABEL_R - 10);
  const dotCount = Math.round(28 - t * 14);              // 바깥 링일수록 도트 촘촘
  const dotR = 2.4 - t * 0.9;                             // 안쪽으로 갈수록 살짝 작아짐
  const angleOffset = i % 2 === 0 ? 0 : Math.PI / dotCount; // 링마다 엇갈리게 배치
  for (let d = 0; d < dotCount; d++) {
    const angle = (d / dotCount) * Math.PI * 2 + angleOffset;
    RINGS.push({
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
      r: dotR,
    });
  }
}

/* ─────────────────────────────────────────────────────── */
/**
 * DotEmptyState — 레코드(바이닐) 도트 컨셉 빈 상태 컴포넌트
 *
 * 검정×흰색 고대비 원반 + 그루브 도트 패턴으로 강한 시각적 임팩트를 준다.
 * dark 테마: 어두운 페이지 배경 위에 흰 원반 + 검정 도트(포인트 컬러=검정)
 * light 테마: 밝은 페이지 배경 위에 검정 원반 + 흰 도트로 반전(여전히 포인트=검정)
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

  /* 검정×흰색 고대비 팔레트 — 테마에 따라 원반/도트 색을 반전 */
  const discFill  = isDark ? '#f5f5f7' : '#0a0a0a';
  const dotFill   = isDark ? '#0a0a0a' : '#f5f5f7';
  const labelFill = isDark ? '#0a0a0a' : '#f5f5f7';
  const titleColor = isDark ? 'rgba(255,255,255,0.92)' : COLORS.text;
  const descColor  = isDark ? 'rgba(255,255,255,0.48)' : COLORS.textMuted;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
        minHeight: 280,
        ...extraStyle,
      }}
    >
      {/* ── 레코드(바이닐) 그래픽 — 검정×흰색 고대비, 강한 존재감 ── */}
      <div style={{ position: 'relative', width: SVG_SIZE, height: SVG_SIZE, marginBottom: 22 }}>
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{
            filter: isDark
              ? 'drop-shadow(0 10px 28px rgba(0,0,0,0.55))'
              : 'drop-shadow(0 10px 24px rgba(10,10,10,0.18))',
          }}
        >
          {/* 원반 */}
          <circle cx={CENTER} cy={CENTER} r={DISC_R} fill={discFill} />
          {/* 그루브 도트 링 */}
          {RINGS.map(({ x, y, r }, i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={dotFill} />
          ))}
          {/* 중앙 라벨 */}
          <circle cx={CENTER} cy={CENTER} r={LABEL_R} fill={labelFill} />
          <circle cx={CENTER} cy={CENTER} r={2.5} fill={discFill} />
        </svg>

        {/* 아이콘 — 중앙 라벨 위에 오버레이 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 22, lineHeight: 1,
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
        }}>
          {icon}
        </div>
      </div>

      {/* ── 텍스트 ── */}
      {title && (
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: titleColor,
            marginBottom: description ? 8 : 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
      )}

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

      {/* ── CTA 버튼 — 포인트 컬러(검정) 강조 버전 ── */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            marginTop: 24,
            padding: '11px 26px',
            background: isDark
              ? (btnHovered ? '#f5f5f7' : '#ffffff')
              : (btnHovered ? '#1a1a1a' : '#0a0a0a'),
            color: isDark ? '#0a0a0a' : '#ffffff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: btnHovered ? 'translateY(-1px)' : 'translateY(0)',
            boxShadow: isDark
              ? (btnHovered ? '0 8px 24px rgba(255,255,255,0.20)' : '0 4px 14px rgba(255,255,255,0.10)')
              : (btnHovered ? '0 8px 24px rgba(0,0,0,0.35)' : '0 4px 14px rgba(0,0,0,0.20)'),
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
