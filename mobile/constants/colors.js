/*
 * Toss 디자인 시스템 (2026-08-29)
 * 웹(frontend/src/constants/colors.js)과 동일한 팔레트를 사용한다.
 */
export const COLORS = {
  /* ── Brand ── */
  primary:   '#3182F6',
  primaryDark: '#1B64DA',
  accent:    '#4E9FFF',
  liked:     '#ec4899',
  fav:       '#f59e0b',
  share:     '#10b981',

  /* ── Feedback ── */
  success:   '#00C471',
  danger:    '#F04452',
  warning:   '#FFB800',
  cancel:    '#a9a9ac',

  /* ── Surface ── */
  bg:        '#F2F4F6',
  white:     '#ffffff',
  card:      '#ffffff',
  inputBg:   '#F5F6F8',
  statsBg:   '#F5F6F8',

  /* ── Dark (Login / Signup, 사진 뷰어) ── */
  dark:      '#1A1E22',
  darkDeep:  '#111417',
  darkAlt:   '#22262B',

  /* ── Border ── */
  border:      '#E5E8EB',
  borderLight: '#EEF1F4',
  borderDark:  '#374151',

  /* ── Text ── */
  textPrimary:   '#191F28',
  textSecondary: '#4E5968',
  textMuted:     '#8B95A1',
  textHint:      '#B0B8C1',
  textLight:     '#d1d5db',

  /* ── Tag ── */
  tagBg:   '#E8F3FF',
  tagText: '#3182F6',
};

export const GENRE_META = {
  PORTRAIT:     { emoji: '👤', label: '인물',         color: '#8B5CF6' },
  WEDDING:      { emoji: '💍', label: '웨딩',         color: '#EC4899' },
  LANDSCAPE:    { emoji: '🏔', label: '풍경',         color: '#3B82F6' },
  NATURE:       { emoji: '🌿', label: '자연',         color: '#10B981' },
  STREET:       { emoji: '🚶', label: '스트리트',     color: '#6B7280' },
  ARCHITECTURE: { emoji: '🏛', label: '건축',         color: '#F59E0B' },
  FOOD:         { emoji: '🍽', label: '음식',         color: '#EF4444' },
  TRAVEL:       { emoji: '✈️', label: '여행',         color: '#06B6D4' },
  FASHION:      { emoji: '👗', label: '패션',         color: '#A855F7' },
  LIFESTYLE:    { emoji: '☀️', label: '라이프스타일', color: '#F97316' },
  COMMERCIAL:   { emoji: '📦', label: '상업',         color: '#64748B' },
  FINE_ART:     { emoji: '🎨', label: '파인아트',     color: '#84CC16' },
};

export const GENRE_LIST = Object.entries(GENRE_META).map(([code, meta]) => ({ code, ...meta }));

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
