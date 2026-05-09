/*
 * Stitch 디자인 교체 방법:
 * 1. src/styles/theme.css 의 :root 값 교체 (CSS 전역 영향)
 * 2. 아래 COLORS 의 hex 값도 동일하게 업데이트 (JS inline style 영향)
 */
export const COLORS = {
  primary:       '#5b6ef5',
  primaryDark:   '#4a5ce0',
  accent:        '#a78bfa',

  background:    '#f7f7fb',
  white:         '#ffffff',
  card:          '#ffffff',
  border:        '#e8e8f0',
  borderLight:   '#f0f0f8',

  text:          '#1a1a2e',
  textSecondary: '#6b6b8a',
  textMuted:     '#9999bb',

  danger:        '#e53e3e',
  success:       '#38a169',
  warning:       '#f59e0b',

  // Dark theme (Login / Signup)
  darkBg:              '#0a0a1a',
  darkCard:            '#1a1a2e',
  darkCardAlt:         '#16163a',
  darkBorder:          '#2a2a4e',
  darkText:            '#e8e8ff',
  darkTextSecondary:   '#8888bb',
};

/*
 * CSS 변수 이름 — 컴포넌트에서 var(CSS_VARS.primary) 형태로 사용 가능.
 * Stitch 교체 후에도 theme.css 한 곳만 수정하면 반영됨.
 */
export const CSS_VARS = {
  primary:       'var(--color-primary)',
  primaryDark:   'var(--color-primary-dark)',
  accent:        'var(--color-accent)',

  bg:            'var(--color-bg)',
  surface:       'var(--color-surface)',
  border:        'var(--color-border)',

  text:          'var(--color-text)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted:     'var(--color-text-muted)',

  danger:        'var(--color-danger)',
  success:       'var(--color-success)',

  darkBg:        'var(--color-dark-bg)',
  darkSurface:   'var(--color-dark-surface)',
  darkBorder:    'var(--color-dark-border)',
  darkText:      'var(--color-dark-text)',
};

export const MOOD_COLORS = {
  WARM:       { dot: '#FF7043', bg: '#FFF3E0', label: '따뜻함'    },
  ENERGETIC:  { dot: '#FFB300', bg: '#FFFDE7', label: '에너지'    },
  NATURAL:    { dot: '#43A047', bg: '#E8F5E9', label: '자연스러움' },
  COOL:       { dot: '#1E88E5', bg: '#E3F2FD', label: '시원함'    },
  SERENE:     { dot: '#5E35B1', bg: '#EDE7F6', label: '평온함'    },
  ROMANTIC:   { dot: '#E91E63', bg: '#FCE4EC', label: '로맨틱'    },
  VIBRANT:    { dot: '#FF4081', bg: '#FFF9C4', label: '생동감'    },
  MUTED:      { dot: '#9E9E9E', bg: '#F5F5F5', label: '차분함'    },
  DRAMATIC:   { dot: '#37474F', bg: '#ECEFF1', label: '극적임'    },
  CLEAN:      { dot: '#90A4AE', bg: '#F8F9FA', label: '청결함'    },
  MONOCHROME: { dot: '#607D8B', bg: '#ECEFF1', label: '단색'      },
};
