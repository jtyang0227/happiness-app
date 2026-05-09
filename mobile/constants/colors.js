/*
 * Stitch 디자인 교체 방법 (React Native):
 * 이 파일의 값을 Stitch 팔레트로 교체하면 앱 전체에 반영됩니다.
 * frontend/src/styles/theme.css 와 값을 일치시켜 주세요.
 */
export const COLORS = {
  /* ── Brand ── */
  primary:   '#5b6ef5',
  primaryDark: '#4a5ce0',
  accent:    '#a78bfa',
  liked:     '#ec4899',
  fav:       '#f59e0b',
  share:     '#10b981',

  /* ── Feedback ── */
  success:   '#34c759',
  danger:    '#ff3b30',
  warning:   '#f59e0b',
  cancel:    '#a9a9ac',

  /* ── Surface ── */
  bg:        '#f7f7fb',
  white:     '#ffffff',
  card:      '#ffffff',
  inputBg:   '#f9fafb',
  statsBg:   '#f9fafb',

  /* ── Dark (Login / Signup) ── */
  dark:      '#1a1a2e',
  darkDeep:  '#0a0a1a',
  darkAlt:   '#16163a',

  /* ── Border ── */
  border:      '#e3e6ef',
  borderLight: '#d1d5db',
  borderDark:  '#374151',

  /* ── Text ── */
  textPrimary:   '#1a1a2e',
  textSecondary: '#4f4f4f',
  textMuted:     '#6b7280',
  textHint:      '#9ca3af',
  textLight:     '#d1d5db',

  /* ── Tag ── */
  tagBg:   '#ede9fe',
  tagText: '#5b6ef5',
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
