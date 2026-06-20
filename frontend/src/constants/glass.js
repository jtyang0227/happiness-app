/**
 * iOS 26 Liquid Glass Design System — V2
 * 핵심 개념: "Refracted Light" — 빛의 굴절
 *
 * V1 vs V2:
 * V1: 단순 rgba + blur → 그냥 반투명
 * V2: 스펙큘러 하이라이트(inset shadow) + brightness/saturate 강화 + 그라디언트 tint
 */

// ─── Glass Material Specification ──────────────────────────────────────────
export const GLASS = {
  // 극도로 투명한 — 아이콘 배경, 마이크로 요소
  bare: {
    bg:       'rgba(255,255,255,0.10)',
    blur:     'blur(16px) saturate(150%)',
    border:   'rgba(255,255,255,0.22)',
    specular: 'rgba(255,255,255,0.30)',
    shadow:   '0 2px 12px rgba(0,0,0,0.06)',
  },
  // 표준 라이트 글래스 — 카드, 패널
  light: {
    bg:       'rgba(255,255,255,0.68)',
    blur:     'blur(32px) saturate(180%) brightness(103%)',
    border:   'rgba(255,255,255,0.58)',
    specular: 'rgba(255,255,255,0.72)',
    shadow:   '0 8px 32px rgba(91,110,245,0.10), 0 2px 8px rgba(0,0,0,0.06)',
  },
  // 강화 라이트 글래스 — 헤더, Nav
  strong: {
    bg:       'rgba(255,255,255,0.84)',
    blur:     'blur(40px) saturate(200%) brightness(104%)',
    border:   'rgba(255,255,255,0.65)',
    specular: 'rgba(255,255,255,0.80)',
    shadow:   '0 4px 20px rgba(91,110,245,0.08), 0 1px 4px rgba(0,0,0,0.04)',
  },
  // 다크 글래스 — 어두운 배경 위
  dark: {
    bg:       'rgba(8,8,22,0.72)',
    blur:     'blur(40px) saturate(180%) brightness(85%)',
    border:   'rgba(255,255,255,0.11)',
    specular: 'rgba(255,255,255,0.10)',
    shadow:   '0 8px 48px rgba(0,0,0,0.55)',
  },
  // 다크 베어 — 반투명 오버레이
  darkBare: {
    bg:       'rgba(8,8,22,0.42)',
    blur:     'blur(24px) saturate(160%)',
    border:   'rgba(255,255,255,0.08)',
    specular: 'rgba(255,255,255,0.06)',
    shadow:   '0 4px 24px rgba(0,0,0,0.35)',
  },
  // 프라이머리 tint 글래스
  tinted: {
    bg:       'rgba(91,110,245,0.16)',
    blur:     'blur(32px) saturate(220%)',
    border:   'rgba(91,110,245,0.28)',
    specular: 'rgba(255,255,255,0.25)',
    shadow:   '0 8px 32px rgba(91,110,245,0.22)',
  },
};

// ─── Style Helpers ──────────────────────────────────────────────────────────

/**
 * 라이트 glass 인라인 스타일 반환.
 * 하단 inset 은 아주 가볍게 처리.
 */
export function glass(variant = 'light', extra = {}) {
  const g = GLASS[variant] || GLASS.light;
  const specularInset =
    `inset 0 1.5px 0 ${g.specular}, inset 0 -0.5px 0 rgba(0,0,0,0.05)`;
  return {
    background:           g.bg,
    backdropFilter:       g.blur,
    WebkitBackdropFilter: g.blur,
    border:               `1px solid ${g.border}`,
    boxShadow:            `${g.shadow}, ${specularInset}`,
    ...extra,
  };
}

/**
 * 다크 glass 인라인 스타일 반환.
 * 하단 inset 이 더 강함 (어두운 배경 위).
 */
export function glassDark(variant = 'dark', extra = {}) {
  const g = GLASS[variant] || GLASS.dark;
  const specularInset =
    `inset 0 1.5px 0 ${g.specular}, inset 0 -0.5px 0 rgba(0,0,0,0.25)`;
  return {
    background:           g.bg,
    backdropFilter:       g.blur,
    WebkitBackdropFilter: g.blur,
    border:               `1px solid ${g.border}`,
    boxShadow:            `${g.shadow}, ${specularInset}`,
    ...extra,
  };
}

// ─── App 배경 상수 ────────────────────────────────────────────────────────────
export const BG = {
  // 라이트 — 은은한 보라/파랑 aurora
  light: [
    'radial-gradient(ellipse at 15% 25%, rgba(167,139,250,0.18) 0%, transparent 55%)',
    'radial-gradient(ellipse at 85% 75%, rgba(91,110,245,0.14) 0%, transparent 55%)',
    'radial-gradient(ellipse at 50% 10%, rgba(196,181,253,0.10) 0%, transparent 40%)',
    '#f8f6ff',
  ].join(', '),

  // 다크 — 딥 퍼플/네이비 aurora
  dark: [
    'radial-gradient(ellipse at 20% 35%, rgba(91,110,245,0.28) 0%, transparent 50%)',
    'radial-gradient(ellipse at 80% 20%, rgba(30,5,69,0.90) 0%, transparent 55%)',
    'radial-gradient(ellipse at 55% 85%, rgba(167,139,250,0.20) 0%, transparent 50%)',
    '#05040f',
  ].join(', '),

  // 갤러리 — 순수 블랙 (사진 집중)
  gallery: '#0a0a0a',
};

// ─── 애니메이션 keyframes CSS ─────────────────────────────────────────────────
export const GLASS_CSS = `
  @keyframes glassIn {
    0%   { opacity: 0; transform: scale(0.95) translateY(14px); filter: blur(6px); }
    60%  { filter: blur(0px); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  @keyframes glassSlideUp {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes bokeh {
    0%,100% { transform: translate(0, 0) scale(1); opacity: 0.65; }
    33%      { transform: translate(28px, -18px) scale(1.06); opacity: 0.85; }
    66%      { transform: translate(-18px, 14px) scale(0.95); opacity: 0.70; }
  }
  @keyframes bokehAlt {
    0%,100% { transform: translate(0, 0) scale(1); opacity: 0.50; }
    40%      { transform: translate(-24px, 20px) scale(1.04); opacity: 0.75; }
    70%      { transform: translate(18px, -12px) scale(0.97); opacity: 0.60; }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes pulseGlow {
    0%,100% { box-shadow: 0 0 0 0 rgba(91,110,245,0.4); }
    50%      { box-shadow: 0 0 0 8px rgba(91,110,245,0); }
  }
  @keyframes orbFloat {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.65; }
    33%       { transform: translate(28px, -18px) scale(1.06); opacity: 0.85; }
    66%       { transform: translate(-18px, 14px) scale(0.95); opacity: 0.70; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
`;

// 하위 호환용 alias
export const GLASS_KEYFRAMES = GLASS_CSS;

// ─── Easing ──────────────────────────────────────────────────────────────────
export const SPRING   = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE     = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ─── 보케 오브 (배경 장식) ────────────────────────────────────────────────────
export const AMBIENT_ORBS = [
  {
    style: {
      position: 'fixed', top: '-10%', left: '-5%',
      width: 600, height: 600, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(91,110,245,0.18) 0%, transparent 70%)',
      filter: 'blur(80px)',
      animation: 'orbFloat 12s ease-in-out infinite',
      pointerEvents: 'none', zIndex: 0,
    },
  },
  {
    style: {
      position: 'fixed', bottom: '-15%', right: '-10%',
      width: 500, height: 500, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 70%)',
      filter: 'blur(80px)',
      animation: 'orbFloat 16s ease-in-out infinite reverse',
      pointerEvents: 'none', zIndex: 0,
    },
  },
  {
    style: {
      position: 'fixed', top: '40%', right: '15%',
      width: 320, height: 320, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,77,109,0.07) 0%, transparent 70%)',
      filter: 'blur(60px)',
      animation: 'orbFloat 20s ease-in-out infinite 4s',
      pointerEvents: 'none', zIndex: 0,
    },
  },
];

// ─── 레거시 호환 ─────────────────────────────────────────────────────────────
// 이전 코드가 GLASS.light.surface, GLASS.dark.border 등을 참조하므로
// GLASS 객체에 compat 프로퍼티를 추가한다.
// 새 코드는 glass() / glassDark() 헬퍼 함수 사용 권장.

// V1 API: GLASS.light / GLASS.dark 하위 compat 프로퍼티 주입
Object.assign(GLASS.light, {
  surface:       GLASS.light.bg,
  surfaceStrong: GLASS.strong.bg,
  blurStrong:    GLASS.strong.blur,
  borderFull:    `1px solid ${GLASS.light.border}`,
  borderSubtle:  `1px solid rgba(255,255,255,0.38)`,
  shadow:        `${GLASS.light.shadow}, inset 0 1.5px 0 ${GLASS.light.specular}`,
  shadowStrong:  `0 16px 48px rgba(91,110,245,0.18), inset 0 1.5px 0 ${GLASS.light.specular}`,
});

Object.assign(GLASS.dark, {
  surface:       GLASS.dark.bg,
  surfaceStrong: GLASS.dark.bg,
  borderFull:    `1px solid ${GLASS.dark.border}`,
  borderSubtle:  `1px solid rgba(255,255,255,0.06)`,
  shadow:        `${GLASS.dark.shadow}, inset 0 1.5px 0 ${GLASS.dark.specular}`,
  shadowStrong:  `0 24px 64px rgba(0,0,0,0.7), inset 0 1.5px 0 ${GLASS.dark.specular}`,
});

// V1 API: C, G, gStyle (dark-first palette 기반)
export const C = {
  bg:       '#07070f',
  surface:  '#0e0e1c',
  text:     '#f0f0ff',
  textSub:  '#8a8ab8',
  textHint: '#4e4e7a',
  primary:  '#6c6ef7',
  accent:   '#9b7ff7',
  danger:   '#ff4d6d',
  success:  '#34d399',
  warning:  '#fbbf24',
  divider:  'rgba(255,255,255,0.06)',
  overlay:  'rgba(0,0,0,0.72)',
};

export const G = {
  chrome: {
    bg: 'rgba(14,14,26,0.96)', blur: 'blur(48px) saturate(200%)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    glow: '0 1px 0 rgba(255,255,255,0.12) inset',
    shadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  thick: {
    bg: 'rgba(16,16,28,0.88)', blur: 'blur(40px) saturate(180%)',
    border: '0.5px solid rgba(255,255,255,0.10)',
    glow: '0 1px 0 rgba(255,255,255,0.10) inset',
    shadow: '0 16px 48px rgba(0,0,0,0.5)',
  },
  regular: {
    bg: 'rgba(18,18,32,0.72)', blur: 'blur(32px) saturate(160%)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    glow: '0 1px 0 rgba(255,255,255,0.08) inset',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  thin: {
    bg: 'rgba(255,255,255,0.05)', blur: 'blur(16px) saturate(140%)',
    border: '0.5px solid rgba(255,255,255,0.06)',
    glow: '0 1px 0 rgba(255,255,255,0.05) inset',
    shadow: 'none',
  },
  tinted: {
    bg: 'rgba(108,110,247,0.15)', blur: 'blur(20px) saturate(160%)',
    border: '0.5px solid rgba(108,110,247,0.35)',
    glow: '0 1px 0 rgba(255,255,255,0.12) inset',
    shadow: '0 4px 20px rgba(108,110,247,0.25)',
  },
};

export function gStyle(level = 'regular', extras = {}) {
  const m = G[level] || G.regular;
  return {
    background:           m.bg,
    backdropFilter:       m.blur,
    WebkitBackdropFilter: m.blur,
    border:               m.border,
    boxShadow:            m.shadow !== 'none' ? `${m.glow}, ${m.shadow}` : m.glow,
    ...extras,
  };
}
