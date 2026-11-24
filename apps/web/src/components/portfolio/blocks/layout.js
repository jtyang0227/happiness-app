/**
 * 포트폴리오 "직접 구성"(BLOCKS) 데이터 — members.portfolio_sections_json / portfolio_style_json.
 * 서버 PortfolioLayoutValidator가 기준(검증·정규화). 여기는 읽기 관대·쓰기 단순.
 * PLANNING_portfolio-blocks.md 3-1.
 */

export const DEFAULT_STYLE = { accent: '#3182F6', background: 'light', spacing: 'normal', headingFont: 'sans' };

/** 강조색 프리셋 — 흰 글자를 올려도 읽히는 색만(버튼 배경으로 쓰인다) */
export const ACCENT_PRESETS = ['#3182F6', '#191F28', '#047857', '#C2410C', '#C2185B', '#6B5B95'];

export const BACKGROUNDS = {
  light: { label: '밝게',   bg: '#FFFFFF', surface: '#F7F8FA', text: '#191F28', sub: '#4E5968', muted: '#8B95A1', border: '#E5E8EB', theme: 'light' },
  paper: { label: '종이',   bg: '#F7F4EE', surface: '#FFFFFF', text: '#2A2723', sub: '#5C564D', muted: '#8A8378', border: '#E6E0D5', theme: 'light' },
  dark:  { label: '어둡게', bg: '#111417', surface: '#1A1E22', text: '#F2F4F6', sub: '#B0B8C1', muted: '#8B95A1', border: '#2E3338', theme: 'dark' },
};
export const SPACINGS = { compact: { label: '좁게', gap: 40 }, normal: { label: '보통', gap: 64 }, airy: { label: '넓게', gap: 96 } };
export const HEADING_FONTS = {
  sans:  { label: '고딕', family: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
  serif: { label: '명조', family: "'Noto Serif KR', 'Nanum Myeongjo', 'AppleMyungjo', serif" },
};

let seq = 0;
export function newBlockId() {
  seq += 1;
  return `b${Date.now().toString(36).slice(-5)}${seq}`;
}

function block(type, props = {}) {
  return { id: newBlockId(), type, visible: true, props };
}

/** 출발점 프리셋 — 처음 열었을 때 고르는 3종 */
export const STARTER_PRESETS = [
  {
    key: 'works', emoji: '📁', name: '작업 중심', desc: '대표 작업과 작업 노트로 맥락을 보여 줘요',
    build: () => [block('hero', { align: 'left', showStats: true }), block('featuredWork', {}), block('works', { title: '작업 노트' }),
      block('testimonials'), block('contact', { title: '촬영 문의', showBooking: true })],
  },
  {
    key: 'hire', emoji: '💼', name: '일 받기 중심', desc: '가격·후기·문의를 앞쪽에 둬요',
    build: () => [block('hero', { align: 'center' }), block('pricing'), block('testimonials'), block('photos', { title: '작업 사진', columns: 3, limit: 9 }),
      block('clients'), block('contact', { title: '촬영 문의', body: '원하시는 날짜와 촬영 종류를 알려 주세요.', showBooking: true })],
  },
  {
    key: 'photos', emoji: '🖼', name: '사진 중심', desc: '사진을 크게, 글은 짧게',
    build: () => [block('hero', { align: 'center' }), block('photos', { columns: 3, limit: 30 }),
      block('quote', { text: '' }), block('contact', { title: '함께 작업해요' })],
  },
];

export function defaultBlocks() {
  return STARTER_PRESETS[0].build();
}

/** 저장된 문자열(또는 객체)을 읽는다. 깨졌으면 null — 화면이 깨지지 않게 */
export function parseSections(raw) {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || !Array.isArray(obj.blocks)) return null;
    return obj.blocks
      .filter(b => b && typeof b.type === 'string')
      .map(b => ({ id: String(b.id || newBlockId()), type: b.type, visible: b.visible !== false, props: b.props && typeof b.props === 'object' ? b.props : {} }));
  } catch {
    return null;
  }
}

export function parseStyle(raw) {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const s = { ...DEFAULT_STYLE, ...(obj || {}) };
    if (!/^#[0-9A-Fa-f]{6}$/.test(s.accent)) s.accent = DEFAULT_STYLE.accent;
    if (!BACKGROUNDS[s.background]) s.background = DEFAULT_STYLE.background;
    if (!SPACINGS[s.spacing]) s.spacing = DEFAULT_STYLE.spacing;
    if (!HEADING_FONTS[s.headingFont]) s.headingFont = DEFAULT_STYLE.headingFont;
    return s;
  } catch {
    return { ...DEFAULT_STYLE };
  }
}

export function serializeSections(blocks) {
  return JSON.stringify({ version: 1, blocks: blocks.map(({ id, type, visible, props }) => ({ id, type, visible, props })) });
}

export function serializeStyle(style) {
  const { accent, background, spacing, headingFont } = style;
  return JSON.stringify({ version: 1, accent, background, spacing, headingFont });
}

/** 블록을 그릴 때 쓰는 테마 값 묶음 */
export function resolveTheme(style) {
  const s = parseStyle(style);
  return { ...BACKGROUNDS[s.background], accent: s.accent, gap: SPACINGS[s.spacing].gap, headingFamily: HEADING_FONTS[s.headingFont].family };
}
