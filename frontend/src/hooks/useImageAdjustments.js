/**
 * 이미지 보정 파이프라인
 *
 * 조정 순서: Blacks → Exposure → Shadows → Highlights → Whites → Contrast → Curve
 * 각 조정은 0-1 정규화된 휘도(luminance)값에 적용 후 0-255 LUT로 저장.
 */

export const DEFAULT_ADJUSTMENTS = {
  exposure:   0,   // EV stops  : -3 ~ +3
  contrast:   0,   // percent   : -100 ~ +100
  highlights: 0,   // percent   : -100 ~ +100
  shadows:    0,   // percent   : -100 ~ +100
  whites:     0,   // percent   : -100 ~ +100
  blacks:     0,   // percent   : -100 ~ +100
};

export const DEFAULT_CURVE_POINTS = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export const DEFAULT_CHANNEL_CURVES = {
  rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  r:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  g:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  b:   [{ x: 0, y: 0 }, { x: 1, y: 1 }],
};

// ── Region weight functions ──────────────────────────────────────────

/** 검정 계열: v=0에서 최대, v≈0.3에서 0 */
function blacksWeight(v) {
  return Math.pow(Math.max(0, 1 - v / 0.3), 2);
}

/** 어두운 영역: v=0.25에서 최대, v=0/0.5에서 0 */
function shadowsWeight(v) {
  if (v <= 0 || v >= 0.5) return 0;
  return Math.pow(Math.sin(Math.PI * v / 0.5), 2);
}

/** 밝은 영역: v=0.75에서 최대, v=0.5/1에서 0 */
function highlightsWeight(v) {
  if (v <= 0.5 || v >= 1) return 0;
  return Math.pow(Math.sin(Math.PI * (v - 0.5) / 0.5), 2);
}

/** 흰색 계열: v=1에서 최대, v≈0.7에서 0 */
function whitesWeight(v) {
  return Math.pow(Math.max(0, (v - 0.7) / 0.3), 2);
}

// ── Catmull-Rom 보간 ─────────────────────────────────────────────────

/**
 * 정렬된 제어점 배열에서 Catmull-Rom 보간으로 y 값 반환.
 * @param {number} x  0-1 입력값
 * @param {{x:number, y:number}[]} pts  x 기준 정렬된 제어점
 */
export function catmullRomY(x, pts) {
  if (pts.length === 0) return x;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;

  let i = 1;
  while (i < pts.length && pts[i].x < x) i++;
  i = Math.min(i, pts.length - 1);

  const p0 = pts[Math.max(0, i - 2)];
  const p1 = pts[i - 1];
  const p2 = pts[i];
  const p3 = pts[Math.min(pts.length - 1, i + 1)];

  const segLen = p2.x - p1.x;
  if (segLen === 0) return p1.y;
  const t  = (x - p1.x) / segLen;
  const t2 = t * t;
  const t3 = t2 * t;

  const y = 0.5 * (
    2 * p1.y +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );
  return Math.max(0, Math.min(1, y));
}

// ── LUT 빌더 ─────────────────────────────────────────────────────────

/**
 * 256-entry 룩업 테이블 생성.
 * @param {typeof DEFAULT_ADJUSTMENTS} adj
 * @param {{x:number,y:number}[]} curvePoints  정렬된 제어점
 * @returns {Uint8Array}
 */
export function buildLUT(adj, curvePoints) {
  const lut = new Uint8Array(256);
  const pts = [...curvePoints].sort((a, b) => a.x - b.x);

  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    // 1. 검정 계열 (흑점 조정)
    const bl = (adj.blacks / 100) * 0.2;
    v += bl * blacksWeight(v);

    // 2. 노출 (EV stop)
    v *= Math.pow(2, adj.exposure);
    v = Math.max(0, Math.min(1, v));

    // 3. 어두운 영역
    v += (adj.shadows / 100) * 0.25 * shadowsWeight(v);

    // 4. 밝은 영역
    v += (adj.highlights / 100) * 0.25 * highlightsWeight(v);

    // 5. 흰색 계열 (백점 조정)
    const wh = (adj.whites / 100) * 0.2;
    v += wh * whitesWeight(v);

    // 6. 대비 (S-커브 vs 선형 압축)
    v = Math.max(0, Math.min(1, v));
    const c = adj.contrast / 100;
    if (c >= 0) {
      v = v < 0.5
        ? 0.5 * Math.pow(2 * v, 1 + c * 2)
        : 1 - 0.5 * Math.pow(2 * (1 - v), 1 + c * 2);
    } else {
      v = (v - 0.5) * (1 + c) + 0.5;
    }

    // 7. 사용자 곡선
    v = Math.max(0, Math.min(1, v));
    v = catmullRomY(v, pts);

    lut[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  return lut;
}

// ── Canvas 적용 ───────────────────────────────────────────────────────

export function renderWithLUT(canvas, originalPixels, w, h, lut) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);
  const src = originalPixels;
  const dst = imageData.data;

  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = lut[src[i]];
    dst[i + 1] = lut[src[i + 1]];
    dst[i + 2] = lut[src[i + 2]];
    dst[i + 3] = src[i + 3];
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── 효과 / 비네팅 / 그레인 ────────────────────────────────────────────

export const DEFAULT_EFFECTS = {
  texture:        0,  // -100 ~ +100 (소반경 언샵마스크)
  clarity:        0,  // -100 ~ +100 (대반경 언샵마스크)
  dehaze:         0,  // -100 ~ +100
  vignette:       0,  // -100 ~ +100 (음수=가장자리 어둡게)
  grainAmount:    0,  // 0 ~ 100
  grainSize:     25,  // 1 ~ 100
  grainRoughness: 50, // 0 ~ 100
};

const GRAIN_TS = 512; // 반드시 2의 거듭제곱

export function generateGrainTile() {
  const tile = new Float32Array(GRAIN_TS * GRAIN_TS);
  for (let i = 0; i < tile.length; i++) {
    const x = Math.sin(i * 9301.0 + 49297.0) * 233280.0;
    tile[i] = (x - Math.floor(x)) - 0.5; // -0.5 ~ +0.5
  }
  return tile;
}

function applyUnsharpMask(canvas, radius, amount) {
  if (amount === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const original = ctx.getImageData(0, 0, w, h);

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tCtx = tmp.getContext('2d');
  tCtx.filter = `blur(${radius}px)`;
  tCtx.drawImage(canvas, 0, 0);
  const blurred = tCtx.getImageData(0, 0, w, h);

  const str = amount / 100;
  const result = ctx.createImageData(w, h);
  for (let i = 0; i < original.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const o = original.data[i + c];
      const b = blurred.data[i + c];
      result.data[i + c] = Math.max(0, Math.min(255, Math.round(o + str * (o - b))));
    }
    result.data[i + 3] = original.data[i + 3];
  }
  ctx.putImageData(result, 0, 0);
}

function applyDehaze(canvas, amount) {
  if (amount === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const str = amount / 100;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (str > 0) {
      // 헤이즈 제거: 채도 + 대비 강화
      const sat = 1 + str * 0.5;
      const nr = lum + (r - lum) * sat;
      const ng = lum + (g - lum) * sat;
      const nb = lum + (b - lum) * sat;
      const c = str * 0.3;
      const curve = (v) => {
        const n = v / 255;
        const cv = n < 0.5
          ? 0.5 * Math.pow(2 * n, 1 + c * 2)
          : 1 - 0.5 * Math.pow(2 * (1 - n), 1 + c * 2);
        return cv * 255;
      };
      d[i]     = Math.max(0, Math.min(255, Math.round(curve(nr))));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(curve(ng))));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(curve(nb))));
    } else {
      // 헤이즈 추가: 대기광(따뜻한 흰색) 방향으로 혼합
      const haze = -str * 0.6;
      d[i]     = Math.round(r + (200 - r) * haze);
      d[i + 1] = Math.round(g + (210 - g) * haze);
      d[i + 2] = Math.round(b + (220 - b) * haze);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyVignette(canvas, amount) {
  if (amount === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) * 0.95;
  const str = Math.abs(amount) / 100 * 0.8;

  const grad = ctx.createRadialGradient(cx, cy, maxR * 0.35, cx, cy, maxR);
  if (amount < 0) {
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${str})`);
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, `rgba(255,255,255,${str})`);
  }
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyGrain(canvas, amount, size, roughness, grainTile) {
  if (amount === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const TS = GRAIN_TS;
  const mask = TS - 1;

  const str = (amount / 100) * 40;
  const scale = Math.max(0.5, size / 25);
  const roughStr = roughness / 100;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const tx = Math.floor(x / scale) & mask;
      const ty = Math.floor(y / scale) & mask;
      let noise = grainTile[ty * TS + tx];

      // 거칠기: 세밀한 노이즈와 혼합
      const fx = (x * 2) & mask;
      const fy = (y * 2) & mask;
      noise = noise * (1 - roughStr * 0.5) + grainTile[fy * TS + fx] * roughStr * 0.5;

      // 중간 밝기에서 그레인이 가장 강하게
      const lum = (d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114) / 255;
      const lumW = 1 - Math.pow(Math.abs(lum * 2 - 1), 2) * 0.7;
      const g = noise * str * 2 * lumW;

      d[idx]     = Math.max(0, Math.min(255, d[idx]     + g));
      d[idx + 1] = Math.max(0, Math.min(255, d[idx + 1] + g));
      d[idx + 2] = Math.max(0, Math.min(255, d[idx + 2] + g));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── 채널별 LUT (per-channel tone curve) ──────────────────────────────

/**
 * 조정값 + 채널별 커브를 합성한 {r, g, b} LUT 세트를 반환.
 * 파이프라인: adjustments + rgb master curve → per-channel curve
 */
export function buildChannelLUTs(adj, channelCurves) {
  const sorted = (pts) => [...(pts || [])].sort((a, b) => a.x - b.x);
  const rgbPts = sorted(channelCurves?.rgb || DEFAULT_CHANNEL_CURVES.rgb);
  const rPts   = sorted(channelCurves?.r   || DEFAULT_CHANNEL_CURVES.r);
  const gPts   = sorted(channelCurves?.g   || DEFAULT_CHANNEL_CURVES.g);
  const bPts   = sorted(channelCurves?.b   || DEFAULT_CHANNEL_CURVES.b);

  const baseLut = buildLUT(adj, rgbPts);

  const rLut = new Uint8Array(256);
  const gLut = new Uint8Array(256);
  const bLut = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    const v = baseLut[i] / 255;
    rLut[i] = Math.min(255, Math.round(catmullRomY(v, rPts) * 255));
    gLut[i] = Math.min(255, Math.round(catmullRomY(v, gPts) * 255));
    bLut[i] = Math.min(255, Math.round(catmullRomY(v, bPts) * 255));
  }
  return { r: rLut, g: gLut, b: bLut };
}

export function renderWithChannelLUTs(canvas, originalPixels, w, h, luts) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);
  const src = originalPixels;
  const dst = imageData.data;

  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = luts.r[src[i]];
    dst[i + 1] = luts.g[src[i + 1]];
    dst[i + 2] = luts.b[src[i + 2]];
    dst[i + 3] = src[i + 3];
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * 원본 픽셀에서 R/G/B/Lum 히스토그램(각 256 bins) 반환.
 */
export function computeHistogram(pixels) {
  const r   = new Uint32Array(256);
  const g   = new Uint32Array(256);
  const b   = new Uint32Array(256);
  const lum = new Uint32Array(256);

  for (let i = 0; i < pixels.length; i += 4) {
    r[pixels[i]]++;
    g[pixels[i + 1]]++;
    b[pixels[i + 2]]++;
    const l = Math.min(255, Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]));
    lum[l]++;
  }
  return { r, g, b, lum };
}

export function applyEffects(canvas, effects, grainTile) {
  applyUnsharpMask(canvas, 4,  effects.texture);  // 텍스처: 소반경
  applyUnsharpMask(canvas, 20, effects.clarity);  // 부분대비: 대반경
  applyDehaze(canvas, effects.dehaze);
  applyVignette(canvas, effects.vignette);
  if (effects.grainAmount > 0 && grainTile) {
    applyGrain(canvas, effects.grainAmount, effects.grainSize, effects.grainRoughness, grainTile);
  }
}
