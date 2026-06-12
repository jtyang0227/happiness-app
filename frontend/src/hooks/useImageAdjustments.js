/**
 * 이미지 보정 파이프라인
 *
 * 조정 순서: Blacks → Exposure → Shadows → Highlights → Whites → Contrast → Curve
 * 각 조정은 0-1 정규화된 휘도(luminance)값에 적용 후 0-255 LUT로 저장.
 */

export const DEFAULT_ADJUSTMENTS = {
  exposure:    0,   // EV stops  : -3 ~ +3
  contrast:    0,   // percent   : -100 ~ +100
  highlights:  0,   // percent   : -100 ~ +100
  shadows:     0,   // percent   : -100 ~ +100
  whites:      0,   // percent   : -100 ~ +100
  blacks:      0,   // percent   : -100 ~ +100
  temperature: 0,   // -100 ~ +100 (차갑게 ~ 따뜻하게)
  tint:        0,   // -100 ~ +100 (초록 ~ 보라)
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

export const DEFAULT_HSL_ADJUSTMENTS = {
  red:     { hue: 0, saturation: 0, luminance: 0 },
  orange:  { hue: 0, saturation: 0, luminance: 0 },
  yellow:  { hue: 0, saturation: 0, luminance: 0 },
  green:   { hue: 0, saturation: 0, luminance: 0 },
  aqua:    { hue: 0, saturation: 0, luminance: 0 },
  blue:    { hue: 0, saturation: 0, luminance: 0 },
  purple:  { hue: 0, saturation: 0, luminance: 0 },
  magenta: { hue: 0, saturation: 0, luminance: 0 },
};

// Center hue angles for each color range
const HSL_RANGE_CENTERS = {
  red:     0,
  orange:  30,
  yellow:  60,
  green:   120,
  aqua:    180,
  blue:    210,
  purple:  270,
  magenta: 330,
};

export const DEFAULT_COLOR_GRADING = {
  shadows:   { hue: 0, saturation: 0 },
  midtones:  { hue: 0, saturation: 0 },
  highlights: { hue: 0, saturation: 0 },
  blending:  50,  // 0~100
};

export const DEFAULT_SHARPENING = {
  amount:  0,    // 0~150
  radius:  1,    // 0.5~3
  detail:  25,   // 0~100 (edge masking threshold)
};

export const DEFAULT_NOISE_REDUCTION = {
  luminance: 0,   // 0~100
  color:     0,   // 0~100
};

// ── Region weight functions ──────────────────────────────────────────

function blacksWeight(v) {
  return Math.pow(Math.max(0, 1 - v / 0.3), 2);
}

function shadowsWeight(v) {
  if (v <= 0 || v >= 0.5) return 0;
  return Math.pow(Math.sin(Math.PI * v / 0.5), 2);
}

function highlightsWeight(v) {
  if (v <= 0.5 || v >= 1) return 0;
  return Math.pow(Math.sin(Math.PI * (v - 0.5) / 0.5), 2);
}

function whitesWeight(v) {
  return Math.pow(Math.max(0, (v - 0.7) / 0.3), 2);
}

// ── Catmull-Rom 보간 ─────────────────────────────────────────────────

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

export function buildLUT(adj, curvePoints) {
  const lut = new Uint8Array(256);
  const pts = [...curvePoints].sort((a, b) => a.x - b.x);

  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    const bl = (adj.blacks / 100) * 0.2;
    v += bl * blacksWeight(v);

    v *= Math.pow(2, adj.exposure);
    v = Math.max(0, Math.min(1, v));

    v += (adj.shadows / 100) * 0.25 * shadowsWeight(v);
    v += (adj.highlights / 100) * 0.25 * highlightsWeight(v);

    const wh = (adj.whites / 100) * 0.2;
    v += wh * whitesWeight(v);

    v = Math.max(0, Math.min(1, v));
    const c = adj.contrast / 100;
    if (c >= 0) {
      v = v < 0.5
        ? 0.5 * Math.pow(2 * v, 1 + c * 2)
        : 1 - 0.5 * Math.pow(2 * (1 - v), 1 + c * 2);
    } else {
      v = (v - 0.5) * (1 + c) + 0.5;
    }

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
  texture:        0,   // -100 ~ +100
  clarity:        0,   // -100 ~ +100
  dehaze:         0,   // -100 ~ +100
  vignette:       0,   // -100 ~ +100
  grainAmount:    0,   // 0 ~ 100
  grainSize:     25,   // 1 ~ 100
  grainRoughness: 50,  // 0 ~ 100
  vibrance:       0,   // -100 ~ +100
  saturation:     0,   // -100 ~ +100
};

const GRAIN_TS = 512;

export function generateGrainTile() {
  const tile = new Float32Array(GRAIN_TS * GRAIN_TS);
  for (let i = 0; i < tile.length; i++) {
    const x = Math.sin(i * 9301.0 + 49297.0) * 233280.0;
    tile[i] = (x - Math.floor(x)) - 0.5;
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

      const fx = (x * 2) & mask;
      const fy = (y * 2) & mask;
      noise = noise * (1 - roughStr * 0.5) + grainTile[fy * TS + fx] * roughStr * 0.5;

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

  // A1: Temperature / Tint as per-channel multipliers
  const temp  = (adj.temperature || 0) / 100;
  const tintV = (adj.tint        || 0) / 100;

  if (temp !== 0 || tintV !== 0) {
    for (let i = 0; i < 256; i++) {
      rLut[i] = Math.max(0, Math.min(255, Math.round(rLut[i] * (1 + temp  * 0.30))));
      bLut[i] = Math.max(0, Math.min(255, Math.round(bLut[i] * (1 - temp  * 0.30))));
      gLut[i] = Math.max(0, Math.min(255, Math.round(gLut[i] * (1 - tintV * 0.20))));
    }
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

// ── RGB ↔ HSL helpers ──────────────────────────────────────────────

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  h /= 6;
  return [h * 360, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function hsl2rgb(h, s, l) {
  h /= 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h)       * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function hsvToRgb(h, s, v) {
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r=v;g=t;b=p; break;
    case 1: r=q;g=v;b=p; break;
    case 2: r=p;g=v;b=t; break;
    case 3: r=p;g=q;b=v; break;
    case 4: r=t;g=p;b=v; break;
    default:r=v;g=p;b=q;
  }
  return [r * 255, g * 255, b * 255];
}

// ── A2: Vibrance / Saturation ─────────────────────────────────────

function applyVibranceSaturation(canvas, vibrance, saturation) {
  if (vibrance === 0 && saturation === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  const satStr = saturation / 100;
  const vibStr = vibrance  / 100;

  for (let i = 0; i < d.length; i += 4) {
    const [hDeg, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);

    // Saturation: linear shift
    let newS = Math.max(0, Math.min(1, s + satStr * (satStr > 0 ? (1 - s) : s)));

    // Vibrance: boost low-saturation pixels more
    if (vibStr !== 0) {
      const vibBoost = vibStr * (1 - s) * (satStr > 0 ? 1 : -1);
      newS = Math.max(0, Math.min(1, newS + Math.abs(vibStr) * (vibrance > 0 ? (1 - s) * 0.7 : -s * 0.7)));
    }

    const [nr, ng, nb] = hsl2rgb(hDeg, newS, l);
    d[i]     = Math.max(0, Math.min(255, nr));
    d[i + 1] = Math.max(0, Math.min(255, ng));
    d[i + 2] = Math.max(0, Math.min(255, nb));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── A3: HSL Panel ────────────────────────────────────────────────

function hueDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function hslRangeWeight(hueDeg, colorName) {
  const center = HSL_RANGE_CENTERS[colorName];
  const dist = hueDistance(hueDeg, center);
  // Gaussian-cosine blend: full weight at center, 0 at ±60°
  return dist > 60 ? 0 : Math.pow(Math.cos((dist / 60) * (Math.PI / 2)), 2);
}

export function applyHSLAdjustments(canvas, hslAdj) {
  if (!hslAdj) return;
  const hasAny = Object.values(hslAdj).some(
    ch => ch.hue !== 0 || ch.saturation !== 0 || ch.luminance !== 0
  );
  if (!hasAny) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let [hDeg, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    if (s < 0.01) continue; // skip near-gray pixels

    let dH = 0, dS = 0, dL = 0;
    for (const [colorName, adj] of Object.entries(hslAdj)) {
      const w = hslRangeWeight(hDeg, colorName);
      if (w < 0.001) continue;
      dH += w * adj.hue;
      dS += w * (adj.saturation / 100);
      dL += w * (adj.luminance  / 100);
    }

    hDeg = ((hDeg + dH) % 360 + 360) % 360;
    s = Math.max(0, Math.min(1, s + dS * (dS > 0 ? 1 - s : s)));
    l = Math.max(0, Math.min(1, l + dL * 0.5));

    const [nr, ng, nb] = hsl2rgb(hDeg, s, l);
    d[i]     = Math.max(0, Math.min(255, nr));
    d[i + 1] = Math.max(0, Math.min(255, ng));
    d[i + 2] = Math.max(0, Math.min(255, nb));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── B1: Color Grading ────────────────────────────────────────────

export function applyColorGrading(canvas, colorGrading) {
  if (!colorGrading) return;
  const { shadows, midtones, highlights, blending = 50 } = colorGrading;
  const hasShadow = shadows.saturation > 0;
  const hasMid    = midtones.saturation > 0;
  const hasHigh   = highlights.saturation > 0;
  if (!hasShadow && !hasMid && !hasHigh) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const blend = blending / 100;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Zone weights
    const swt = Math.pow(Math.max(0, 1 - lum / 0.4), 2);
    const mwt = Math.pow(Math.cos((lum - 0.5) * Math.PI), 2);
    const hwt = Math.pow(Math.max(0, (lum - 0.6) / 0.4), 2);

    let dr = 0, dg = 0, db = 0;

    if (hasShadow && swt > 0.001) {
      const [cr, cg, cb] = hsvToRgb(shadows.hue, shadows.saturation / 100, 0.5);
      dr += (cr - 128) * swt * blend * 0.3;
      dg += (cg - 128) * swt * blend * 0.3;
      db += (cb - 128) * swt * blend * 0.3;
    }
    if (hasMid && mwt > 0.001) {
      const [cr, cg, cb] = hsvToRgb(midtones.hue, midtones.saturation / 100, 0.5);
      dr += (cr - 128) * mwt * blend * 0.3;
      dg += (cg - 128) * mwt * blend * 0.3;
      db += (cb - 128) * mwt * blend * 0.3;
    }
    if (hasHigh && hwt > 0.001) {
      const [cr, cg, cb] = hsvToRgb(highlights.hue, highlights.saturation / 100, 0.5);
      dr += (cr - 128) * hwt * blend * 0.3;
      dg += (cg - 128) * hwt * blend * 0.3;
      db += (cb - 128) * hwt * blend * 0.3;
    }

    d[i]     = Math.max(0, Math.min(255, Math.round(r + dr)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(g + dg)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(b + db)));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── C1: Sharpening (Unsharp Mask with edge masking) ───────────────

export function applySharpening(canvas, sharpening) {
  if (!sharpening || sharpening.amount === 0) return;
  const { amount, radius, detail } = sharpening;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const original = ctx.getImageData(0, 0, w, h);

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tCtx = tmp.getContext('2d');
  tCtx.filter = `blur(${Math.max(0.5, radius)}px)`;
  tCtx.drawImage(canvas, 0, 0);
  const blurred = tCtx.getImageData(0, 0, w, h);

  const str = amount / 100;
  const threshold = detail / 100 * 60; // pixel threshold for edge masking
  const result = ctx.createImageData(w, h);
  const od = original.data, bd = blurred.data;

  for (let i = 0; i < od.length; i += 4) {
    const edge = Math.abs(
      0.299 * (od[i] - bd[i]) + 0.587 * (od[i+1] - bd[i+1]) + 0.114 * (od[i+2] - bd[i+2])
    );
    // Edge mask: only sharpen where edge > threshold
    const mask = threshold === 0 ? 1 : Math.min(1, edge / threshold);

    for (let c = 0; c < 3; c++) {
      const o = od[i + c], b = bd[i + c];
      result.data[i + c] = Math.max(0, Math.min(255, Math.round(o + str * (o - b) * mask)));
    }
    result.data[i + 3] = od[i + 3];
  }
  ctx.putImageData(result, 0, 0);
}

// ── C2: Noise Reduction ───────────────────────────────────────────

export function applyNoiseReduction(canvas, noiseReduction) {
  if (!noiseReduction) return;
  const { luminance, color } = noiseReduction;
  if (luminance === 0 && color === 0) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  if (color > 0) {
    // Color NR: blur only chroma (preserve luma)
    const before = ctx.getImageData(0, 0, w, h);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tCtx = tmp.getContext('2d');
    const blurRadius = (color / 100) * 3;
    tCtx.filter = `blur(${blurRadius}px)`;
    tCtx.drawImage(canvas, 0, 0);
    const blurred = tCtx.getImageData(0, 0, w, h);
    const result = ctx.createImageData(w, h);
    const bd = before.data, bld = blurred.data;

    for (let i = 0; i < bd.length; i += 4) {
      const [, , origL] = rgb2hsl(bd[i], bd[i+1], bd[i+2]);
      const [blurH, blurS] = rgb2hsl(bld[i], bld[i+1], bld[i+2]);
      const [nr, ng, nb] = hsl2rgb(blurH, blurS, origL);
      result.data[i]   = Math.max(0, Math.min(255, nr));
      result.data[i+1] = Math.max(0, Math.min(255, ng));
      result.data[i+2] = Math.max(0, Math.min(255, nb));
      result.data[i+3] = bd[i+3];
    }
    ctx.putImageData(result, 0, 0);
  }

  if (luminance > 0) {
    // Luminance NR: gaussian blur
    const blurRadius = (luminance / 100) * 2;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tCtx = tmp.getContext('2d');
    tCtx.filter = `blur(${blurRadius}px)`;
    tCtx.drawImage(canvas, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }
}

// ── D2: Clipping Warning overlay ──────────────────────────────────

export function renderClippingOverlay(overlayCanvas, processedCanvas, threshold = 8) {
  const w = processedCanvas.width, h = processedCanvas.height;
  overlayCanvas.width  = w;
  overlayCanvas.height = h;

  const srcCtx = processedCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const d = srcData.data;

  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const od = out.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    // Highlight clipping: all channels near 255
    if (r >= 255 - threshold && g >= 255 - threshold && b >= 255 - threshold) {
      od[i] = 255; od[i+1] = 0; od[i+2] = 0; od[i+3] = 180;
    }
    // Shadow clipping: all channels near 0
    else if (r <= threshold && g <= threshold && b <= threshold) {
      od[i] = 0; od[i+1] = 100; od[i+2] = 255; od[i+3] = 180;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ── Histogram ────────────────────────────────────────────────────

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

// ── Main effects pipeline ────────────────────────────────────────

export function applyEffects(
  canvas,
  effects,
  grainTile,
  hslAdj = null,
  colorGrading = null,
  sharpening = null,
  noiseReduction = null
) {
  // A2: Vibrance / Saturation (before other effects)
  if (effects.vibrance !== 0 || effects.saturation !== 0) {
    applyVibranceSaturation(canvas, effects.vibrance, effects.saturation);
  }

  // A3: HSL Panel
  applyHSLAdjustments(canvas, hslAdj);

  // B1: Color Grading
  applyColorGrading(canvas, colorGrading);

  // C1: Sharpening
  applySharpening(canvas, sharpening);

  // C2: Noise Reduction
  applyNoiseReduction(canvas, noiseReduction);

  // Existing effects
  applyUnsharpMask(canvas, 4,  effects.texture);
  applyUnsharpMask(canvas, 20, effects.clarity);
  applyDehaze(canvas, effects.dehaze);
  applyVignette(canvas, effects.vignette);
  if (effects.grainAmount > 0 && grainTile) {
    applyGrain(canvas, effects.grainAmount, effects.grainSize, effects.grainRoughness, grainTile);
  }
}
