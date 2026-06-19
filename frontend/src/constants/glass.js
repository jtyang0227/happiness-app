export const GLASS = {
  light: {
    surface:       'rgba(255,255,255,0.72)',
    surfaceStrong: 'rgba(255,255,255,0.88)',
    surfaceSubtle: 'rgba(255,255,255,0.52)',
    blur:          'blur(20px) saturate(180%)',
    blurStrong:    'blur(32px) saturate(200%)',
    border:        'rgba(255,255,255,0.60)',
    borderSubtle:  'rgba(91,110,245,0.10)',
    shadow:        '0 8px 32px rgba(91,110,245,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    shadowStrong:  '0 16px 48px rgba(91,110,245,0.14), 0 4px 16px rgba(0,0,0,0.06)',
  },
  dark: {
    surface:       'rgba(12,12,30,0.75)',
    surfaceStrong: 'rgba(10,10,24,0.92)',
    surfaceSubtle: 'rgba(20,20,48,0.60)',
    blur:          'blur(24px) saturate(160%)',
    blurStrong:    'blur(40px) saturate(180%)',
    border:        'rgba(255,255,255,0.10)',
    borderSubtle:  'rgba(255,255,255,0.06)',
    shadow:        '0 8px 32px rgba(0,0,0,0.4)',
    shadowStrong:  '0 16px 48px rgba(0,0,0,0.6)',
  },
};

export function glassStyle(mode = 'light', overrides = {}) {
  const g = GLASS[mode];
  return {
    background:           g.surface,
    backdropFilter:       g.blur,
    WebkitBackdropFilter: g.blur,
    border:               `1px solid ${g.border}`,
    boxShadow:            g.shadow,
    ...overrides,
  };
}

export const GLASS_KEYFRAMES = `
  @keyframes glassIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes bokehFloat {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-20px) scale(1.04); }
  }
  @keyframes glassShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
`;

export const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
