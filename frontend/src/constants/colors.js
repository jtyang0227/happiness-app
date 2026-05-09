/*
 * Stitch 디자인 교체:
 * 1. src/styles/theme.css :root 값 교체 → CSS 전역 반영
 * 2. 아래 COLORS hex 값 교체 → JS inline style 반영
 */
export const COLORS = {
  primary:       '#5b6ef5',
  primaryDark:   '#4458e0',
  primaryLight:  '#eef0ff',
  primaryTonal:  '#dde0ff',
  accent:        '#a78bfa',

  bg:            '#f5f5fa',
  surface:       '#ffffff',
  surfaceDim:    '#ededf4',
  border:        '#e2e2ee',
  borderLight:   '#ededf5',

  text:          '#1a1a2e',
  textSecondary: '#5c5c7a',
  textMuted:     '#9090b0',
  textHint:      '#b8b8d0',

  danger:        '#e53e3e',
  dangerTonal:   '#fff0f0',
  success:       '#2ea44f',
  successTonal:  '#f0fff4',
  warning:       '#f59e0b',

  // Dark theme (Login / Signup)
  darkBg:        '#0a0a18',
  darkSurface:   '#12122a',
  darkElevated:  '#1a1a3a',
  darkBorder:    '#2a2a50',
  darkText:      '#eeeeff',
  darkTextSub:   '#8888cc',
  darkTextHint:  '#5555aa',

  // Gallery
  galleryBg:     '#0e0e0e',
  galleryBorder: '#1e1e1e',
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
