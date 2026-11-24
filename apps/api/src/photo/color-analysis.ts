/**
 * Spring ColorAnalysisUtil 1:1 — 256px 변형에서 약 2000픽셀 샘플 → 4비트 양자화 버킷 상위 5색 → 대표색·분위기·팔레트.
 * Java float 연산과 같은 임계값 판정을 위해 Math.fround로 단정도 계산을 흉내 낸다.
 * (리사이즈 결과 픽셀은 라이브러리마다 조금 달라 대표색이 Spring과 한두 단계 다를 수 있다 — README 알려진 차이)
 */
const f = Math.fround;

export interface ColorResult { dominantColor: string; colorMood: string; colorPalette: string }

/** data: RGBA 행 우선, width×height */
export function analyzeColors(data: Uint8Array, width: number, height: number): ColorResult {
  const total = width * height;
  if (total === 0) return fallback();
  const counts = new Int32Array(4096);
  const step = Math.max(1, Math.floor(total / 2000));
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    counts[((data[o] >> 4) << 8) | ((data[o + 1] >> 4) << 4) | (data[o + 2] >> 4)]++;
  }
  const buckets: number[] = [];
  for (let i = 0; i < 4096; i++) if (counts[i] > 0) buckets.push(i);
  buckets.sort((a, b) => counts[b] - counts[a]); // 안정 정렬 — 동점은 버킷 번호순(Java와 같음)
  const palette = buckets.slice(0, 5).map((b) => [((b >> 8) & 0xf) * 17, ((b >> 4) & 0xf) * 17, (b & 0xf) * 17]);
  if (palette.length === 0) return fallback();
  return {
    dominantColor: toHex(palette[0]),
    colorMood: classifyMood(palette[0]),
    colorPalette: `[${palette.map((p) => `"${toHex(p)}"`).join(',')}]`,
  };
}

export function classifyMood([r, g, b]: number[]): string {
  const [hue, sat, lit] = rgbToHsl(r, g, b);
  if (lit < f(0.15)) return 'DRAMATIC';
  if (lit > f(0.88)) return 'CLEAN';
  if (sat < f(0.12)) return 'MONOCHROME';
  if (sat < f(0.32)) return 'MUTED';
  if (sat > f(0.75)) return 'VIBRANT';
  if (hue < 30 || hue >= 330) return 'WARM';
  if (hue < 70) return 'ENERGETIC';
  if (hue < 160) return 'NATURAL';
  if (hue < 220) return 'COOL';
  if (hue < 270) return 'SERENE';
  return 'ROMANTIC';
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = f(r / 255), gf = f(g / 255), bf = f(b / 255);
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const delta = f(max - min);
  const l = f(f(max + min) / 2);
  const s = delta < f(0.001) ? 0 : f(delta / f(1 - Math.abs(f(f(2 * l) - 1))));
  let h = 0;
  if (delta > f(0.001)) {
    if (max === rf) h = f(60 * (f(f(gf - bf) / delta) % 6));
    else if (max === gf) h = f(60 * f(f(f(bf - rf) / delta) + 2));
    else h = f(60 * f(f(f(rf - gf) / delta) + 4));
    if (h < 0) h = f(h + 360);
  }
  return [h, s, l];
}

const toHex = (p: number[]) => '#' + p.map((v) => v.toString(16).toUpperCase().padStart(2, '0')).join('');
const fallback = (): ColorResult => ({ dominantColor: '#808080', colorMood: 'MUTED', colorPalette: '["#808080"]' });
