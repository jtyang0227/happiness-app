/**
 * usePresets 로직 검증 — localStorage 순수 함수 레벨 테스트
 * (hook rendering 없이 핵심 로직만 검증)
 */

const STORAGE_KEY = 'happiness-photo-presets';
const MAX_PRESETS = 5;

// ── 테스트용 순수 함수 (usePresets 내부 로직 추출) ────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function deepCloneCurves(cc) {
  return {
    rgb: cc.rgb.map(p => ({ ...p })),
    r:   cc.r.map(p => ({ ...p })),
    g:   cc.g.map(p => ({ ...p })),
    b:   cc.b.map(p => ({ ...p })),
  };
}

function addPreset(presets, name, adjustments, channelCurves, effects) {
  if (presets.length >= MAX_PRESETS) return presets;
  return [...presets, {
    id: `test-${presets.length}`,
    name: name.trim() || `프리셋 ${presets.length + 1}`,
    createdAt: new Date().toISOString(),
    adjustments: { ...adjustments },
    channelCurves: deepCloneCurves(channelCurves),
    effects: { ...effects },
  }];
}

function removePreset(presets, id) {
  return presets.filter(p => p.id !== id);
}

function renamePreset(presets, id, name) {
  if (!name.trim()) return presets;
  return presets.map(p => p.id === id ? { ...p, name: name.trim() } : p);
}

// ── 테스트 데이터 ──────────────────────────────────────────────────────────

const adj = { exposure: 0.5, contrast: 20, highlights: -10, shadows: 30, whites: 0, blacks: -5 };
const curves = {
  rgb: [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }],
  r:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  g:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  b:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
};
const fx = { texture: 15, clarity: 0, dehaze: 0, vignette: -30, grainAmount: 10, grainSize: 25, grainRoughness: 50 };

beforeEach(() => localStorage.clear());

// ── 프리셋 추가 ────────────────────────────────────────────────────────────

test('프리셋 추가 — 기본 필드', () => {
  let p = [];
  p = addPreset(p, '무디 블루', adj, curves, fx);
  expect(p).toHaveLength(1);
  expect(p[0].name).toBe('무디 블루');
  expect(p[0].adjustments.exposure).toBe(0.5);
  expect(p[0].channelCurves.rgb).toHaveLength(3);
  expect(p[0].effects.vignette).toBe(-30);
});

test('프리셋 추가 — 이름 공백 시 기본 이름 자동 부여', () => {
  let p = [];
  p = addPreset(p, '  ', adj, curves, fx);
  expect(p[0].name).toBe('프리셋 1');
});

test('최대 5개 제한', () => {
  let p = [];
  for (let i = 0; i < 8; i++) p = addPreset(p, `프리셋 ${i}`, adj, curves, fx);
  expect(p).toHaveLength(MAX_PRESETS);
});

// ── 프리셋 삭제 ────────────────────────────────────────────────────────────

test('프리셋 삭제', () => {
  let p = [];
  p = addPreset(p, '삭제 대상', adj, curves, fx);
  p = addPreset(p, '유지 대상', adj, curves, fx);
  expect(p).toHaveLength(2);
  p = removePreset(p, 'test-0');
  expect(p).toHaveLength(1);
  expect(p[0].name).toBe('유지 대상');
});

test('존재하지 않는 id 삭제 — 무변화', () => {
  let p = [];
  p = addPreset(p, '존재', adj, curves, fx);
  p = removePreset(p, 'ghost-id');
  expect(p).toHaveLength(1);
});

// ── 프리셋 이름 수정 ───────────────────────────────────────────────────────

test('이름 수정', () => {
  let p = [];
  p = addPreset(p, '원래 이름', adj, curves, fx);
  p = renamePreset(p, 'test-0', '새 이름');
  expect(p[0].name).toBe('새 이름');
});

test('공백 이름으로 rename 시 무시', () => {
  let p = [];
  p = addPreset(p, '원래 이름', adj, curves, fx);
  p = renamePreset(p, 'test-0', '   ');
  expect(p[0].name).toBe('원래 이름');
});

test('이름 앞뒤 공백 trim', () => {
  let p = [];
  p = addPreset(p, '  공백 이름  ', adj, curves, fx);
  p = renamePreset(p, 'test-0', '  새 이름  ');
  expect(p[0].name).toBe('새 이름');
});

// ── localStorage 영속화 ────────────────────────────────────────────────────

test('localStorage 저장 및 복원', () => {
  let p = [];
  p = addPreset(p, '영속 테스트', adj, curves, fx);
  save(p);

  const loaded = load();
  expect(loaded).toHaveLength(1);
  expect(loaded[0].name).toBe('영속 테스트');
  expect(loaded[0].adjustments.contrast).toBe(20);
});

test('localStorage 손상 시 빈 배열 반환', () => {
  localStorage.setItem(STORAGE_KEY, 'invalid-json{');
  const loaded = load();
  expect(loaded).toEqual([]);
});

// ── 딥 카피 (불변성) ───────────────────────────────────────────────────────

test('저장된 커브는 원본과 독립적', () => {
  const mutableCurves = {
    rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    r:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    g:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    b:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  };
  let p = [];
  p = addPreset(p, '딥카피', adj, mutableCurves, fx);

  // 원본 커브 변경
  mutableCurves.rgb.push({ x: 0.5, y: 0.5 });

  expect(p[0].channelCurves.rgb).toHaveLength(2);
});

test('저장된 adjustments는 원본과 독립적', () => {
  const mutableAdj = { ...adj };
  let p = [];
  p = addPreset(p, '딥카피', mutableAdj, curves, fx);

  mutableAdj.exposure = 99;

  expect(p[0].adjustments.exposure).toBe(0.5);
});

// ── 프리셋 적용 (데이터 구조 검증) ────────────────────────────────────────

test('프리셋 적용 시 반환값이 올바른 구조', () => {
  let p = [];
  p = addPreset(p, '적용 테스트', adj, curves, fx);

  const preset = p[0];
  // 적용 시 복사본을 만들어야 함
  const applied = {
    adjustments:   { ...preset.adjustments },
    channelCurves: deepCloneCurves(preset.channelCurves),
    effects:       { ...preset.effects },
  };

  expect(applied.adjustments).toEqual(adj);
  expect(applied.channelCurves.rgb).toHaveLength(3);
  expect(applied.effects.vignette).toBe(-30);
  expect(applied.channelCurves.rgb).not.toBe(preset.channelCurves.rgb); // 독립 복사
});
