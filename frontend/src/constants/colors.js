/*
 * Toss 디자인 시스템 (2026-08-29) — DESIGN_PROMPTS/design/DESIGN_PROMPT_toss-design-system.md
 *
 * 기존 AKIRA Neo-Tokyo(레드/시안) + Cosmos 화이트 체계를 전면 폐기하고
 * 토스(Toss)의 시각 언어(블루 단일 브랜드 컬러, 회색조, 플랫 서페이스)로 교체했다.
 * - primary는 블루 하나뿐이며 배경을 칠하는 용도로 쓰지 않고 CTA·활성 상태에만 사용한다.
 * - danger/success/warning은 의미 전달용이며 브랜드 액센트가 아니다.
 * - 그림자에 브랜드 컬러를 tint하지 않는다(플랫 디자인 — 컬러 있는 glow 금지).
 */
export const COLORS = {
  primary:       '#3182F6',   // Toss Blue
  primaryDark:   '#1B64DA',   // hover/pressed
  primaryLight:  '#E8F3FF',   // 옅은 블루 배경(배지, 태그, 선택 상태)
  primaryTonal:  '#C9E2FF',
  accent:        '#4E9FFF',   // 그라디언트 등 보조용, 단독 배경 칠하기 금지

  bg:            '#F2F4F6',
  surface:       '#ffffff',
  surfaceDim:    '#F5F6F8',
  border:        '#E5E8EB',
  borderLight:   '#EEF1F4',

  text:          '#191F28',
  textSecondary: '#4E5968',
  textMuted:     '#8B95A1',
  textHint:      '#B0B8C1',

  danger:        '#F04452',
  dangerTonal:   '#FFEEEF',
  success:       '#00C471',
  successTonal:  '#E5F9F0',
  warning:       '#FFB800',

  // Dark 예외 영역 전용 (이미지 뷰어/에디터 — 사진 감상 목적, 브랜드 테마와 무관)
  darkBg:        '#111417',
  darkSurface:   '#1A1E22',
  darkElevated:  '#22262B',
  darkBorder:    '#2E3338',
  darkText:      '#F2F4F6',
  darkTextSub:   '#8B95A1',
  darkTextHint:  '#5B6472',

  // Gallery / 이미지 뷰어 전용
  galleryBg:     '#111417',
  galleryBorder: '#22262B',
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

export const GENRE_META = {
  PORTRAIT:     { emoji: '👤', label: '인물',        color: '#8B5CF6' },
  WEDDING:      { emoji: '💍', label: '웨딩',        color: '#EC4899' },
  LANDSCAPE:    { emoji: '🏔', label: '풍경',        color: '#3B82F6' },
  NATURE:       { emoji: '🌿', label: '자연',        color: '#10B981' },
  STREET:       { emoji: '🚶', label: '스트리트',     color: '#6B7280' },
  ARCHITECTURE: { emoji: '🏛', label: '건축',        color: '#F59E0B' },
  FOOD:         { emoji: '🍽', label: '음식',        color: '#EF4444' },
  TRAVEL:       { emoji: '✈️', label: '여행',        color: '#06B6D4' },
  FASHION:      { emoji: '👗', label: '패션',        color: '#A855F7' },
  LIFESTYLE:    { emoji: '☀️', label: '라이프스타일', color: '#F97316' },
  COMMERCIAL:   { emoji: '📦', label: '상업',        color: '#64748B' },
  FINE_ART:     { emoji: '🎨', label: '파인아트',    color: '#84CC16' },
};

export const GENRE_LIST = Object.entries(GENRE_META).map(([code, meta]) => ({ code, ...meta }));
