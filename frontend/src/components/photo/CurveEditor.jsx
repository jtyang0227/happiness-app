import React, { useRef, useEffect, useState, useCallback } from 'react';
import { catmullRomY } from '../../hooks/useImageAdjustments';

const CANVAS = 280;
const PAD    = 16;
const PLOT   = CANVAS - PAD * 2;
const HIT_R  = 14;
const DOT_R  = 5;

const CHANNEL_CONFIG = {
  rgb: { label: 'RGB', color: '#c8caff', histKey: 'lum', rgb: '180,182,255', accent: '#a0a4ff' },
  r:   { label: 'R',   color: '#ff7080', histKey: 'r',   rgb: '255,100,110', accent: '#ff4055' },
  g:   { label: 'G',   color: '#50e870', histKey: 'g',   rgb: '60,220,100',  accent: '#2acc50' },
  b:   { label: 'B',   color: '#6aabff', histKey: 'b',   rgb: '90,160,255',  accent: '#4090ff' },
};

// Zone labels on the X axis
const ZONES = [
  { x: 0,    label: 'Blk' },
  { x: 0.25, label: 'Shd' },
  { x: 0.50, label: 'Mid' },
  { x: 0.75, label: 'Hlt' },
  { x: 1,    label: 'Wht' },
];

function toCanvas(pt) {
  return { cx: PAD + pt.x * PLOT, cy: PAD + (1 - pt.y) * PLOT };
}

function toNorm(cx, cy) {
  return {
    x: Math.max(0, Math.min(1, (cx - PAD) / PLOT)),
    y: Math.max(0, Math.min(1, 1 - (cy - PAD) / PLOT)),
  };
}

/**
 * Premium Lightroom-style per-channel tone curve editor.
 *
 * props:
 *   channelCurves        — { rgb, r, g, b } each [{x,y}]
 *   onChannelCurveChange — (channel, points) => void
 *   histogram            — { r, g, b, lum } Uint32Array(256) | null
 */
export default function CurveEditor({ channelCurves, onChannelCurveChange, histogram }) {
  const canvasRef = useRef(null);
  const [channel, setChannel] = useState('rgb');
  const [dragging, setDragging] = useState(null);
  const [hoverPt, setHoverPt]   = useState(null);
  const [hovered, setHovered]   = useState(false);

  const cfg    = CHANNEL_CONFIG[channel];
  const points = channelCurves?.[channel] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  // ── Histogram ─────────────────────────────────────────────────────
  const drawHistogram = useCallback((ctx) => {
    if (!histogram) return;
    const data = histogram[cfg.histKey];
    if (!data) return;

    const max = Math.max(...data);
    if (!max) return;

    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x   = PAD + (i / 255) * PLOT;
      const logH = data[i] > 0 ? Math.log1p(data[i]) / Math.log1p(max) : 0;
      const h   = logH * (PLOT * 0.85);
      const y   = PAD + PLOT - h;
      if (i === 0) { ctx.moveTo(PAD, PAD + PLOT); ctx.lineTo(x, y); }
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(PAD + PLOT, PAD + PLOT);
    ctx.closePath();
    ctx.fillStyle = `rgba(${cfg.rgb},0.10)`;
    ctx.fill();
  }, [histogram, cfg]);

  // ── Main draw ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Background — rich dark
    ctx.fillStyle = '#0c0c1a';
    ctx.fillRect(0, 0, CANVAS * dpr, CANVAS * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Subtle zone bands (alternating tint)
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.018)';
        ctx.fillRect(PAD + (PLOT / 4) * i, PAD, PLOT / 4, PLOT);
      }
    }

    // Histogram
    drawHistogram(ctx);

    // 4×4 grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const ox = PAD + (PLOT / 4) * i;
      const oy = PAD + (PLOT / 4) * i;
      ctx.beginPath(); ctx.moveTo(ox, PAD); ctx.lineTo(ox, PAD + PLOT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, oy); ctx.lineTo(PAD + PLOT, oy); ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, PLOT, PLOT);

    // Identity diagonal — subtle
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + PLOT);
    ctx.lineTo(PAD + PLOT, PAD);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone axis labels
    ctx.font = `${8 * (1 / dpr)}px -apple-system, "SF Pro Text", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'center';
    ZONES.forEach(({ x, label }) => {
      const cx = PAD + x * PLOT;
      ctx.fillText(label, cx, PAD + PLOT + 10);
    });

    // Curve area fill
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const grad = ctx.createLinearGradient(PAD, PAD, PAD, PAD + PLOT);
    grad.addColorStop(0, `rgba(${cfg.rgb},0.14)`);
    grad.addColorStop(1, `rgba(${cfg.rgb},0.02)`);

    ctx.beginPath();
    ctx.moveTo(PAD, PAD + PLOT);
    for (let i = 0; i <= PLOT; i++) {
      const nx = i / PLOT;
      const ny = catmullRomY(nx, sorted);
      ctx.lineTo(PAD + nx * PLOT, PAD + (1 - ny) * PLOT);
    }
    ctx.lineTo(PAD + PLOT, PAD + PLOT);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Curve line — bright + glow
    ctx.save();
    ctx.shadowColor = cfg.accent;
    ctx.shadowBlur  = hovered ? 10 : 6;
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth   = 1.75;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    for (let i = 0; i <= PLOT; i++) {
      const nx = i / PLOT;
      const ny = catmullRomY(nx, sorted);
      const cx = PAD + nx * PLOT;
      const cy = PAD + (1 - ny) * PLOT;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Control points
    points.forEach((pt, idx) => {
      const { cx, cy } = toCanvas(pt);
      const isActive = dragging === idx;
      const isEdge   = idx === 0 || idx === points.length - 1;

      // Outer glow ring when active
      if (isActive) {
        ctx.beginPath();
        ctx.arc(cx, cy, DOT_R + 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cfg.rgb},0.22)`;
        ctx.fill();
      }

      // Dot shadow
      ctx.save();
      ctx.shadowColor = isActive ? cfg.accent : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = isActive ? 10 : 4;

      // Dot fill
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? cfg.color : (isEdge ? 'rgba(200,200,220,0.6)' : 'rgba(230,230,255,0.90)');
      ctx.fill();

      // Dot border
      ctx.strokeStyle = isActive ? cfg.accent : cfg.color;
      ctx.lineWidth   = isActive ? 1.5 : 1;
      ctx.stroke();
      ctx.restore();
    });

    // Drag coordinate overlay — pill badge
    if (dragging !== null && hoverPt) {
      const inV  = Math.round(hoverPt.x * 255);
      const outV = Math.round(hoverPt.y * 255);
      const text = `In ${inV}  ·  Out ${outV}`;
      ctx.font = `bold ${9 * (1 / dpr)}px -apple-system, "SF Pro Text", monospace`;
      const tw = ctx.measureText(text).width + 14;
      const bx = CANVAS / dpr - tw - 6;
      const by = 6;
      ctx.fillStyle = 'rgba(10,10,24,0.88)';
      roundRect(ctx, bx, by, tw, 16, 5);
      ctx.fill();
      ctx.fillStyle = cfg.color;
      ctx.textAlign = 'left';
      ctx.fillText(text, bx + 7, by + 11);
    }

    ctx.restore();
  }, [points, dragging, hoverPt, cfg, drawHistogram, hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = CANVAS * dpr;
    canvas.height = (CANVAS + 14) * dpr; // extra for zone labels
    canvas.style.width  = `${CANVAS}px`;
    canvas.style.height = `${CANVAS + 14}px`;
    draw();
  }, [draw]);

  // ── Event helpers ──────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    const scaleX = CANVAS / rect.width;
    const scaleY = CANVAS / rect.height;
    return {
      cx: (src.clientX - rect.left) * scaleX,
      cy: (src.clientY - rect.top)  * scaleY,
    };
  };

  const nearestIdx = (cx, cy) => {
    let best = HIT_R, idx = -1;
    points.forEach((pt, i) => {
      const p = toCanvas(pt);
      const d = Math.hypot(p.cx - cx, p.cy - cy);
      if (d < best) { best = d; idx = i; }
    });
    return idx;
  };

  const onDown = (e) => {
    e.preventDefault();
    const { cx, cy } = getPos(e);
    const idx = nearestIdx(cx, cy);
    if (idx >= 0) {
      setDragging(idx);
      setHoverPt({ x: points[idx].x, y: points[idx].y });
      return;
    }
    const norm = toNorm(cx, cy);
    if (norm.x <= 0.01 || norm.x >= 0.99) return;
    const newPts = [...points, norm].sort((a, b) => a.x - b.x);
    const newIdx = newPts.findIndex(p => Math.abs(p.x - norm.x) < 1e-9);
    onChannelCurveChange(channel, newPts);
    setDragging(newIdx >= 0 ? newIdx : newPts.length - 1);
    setHoverPt(norm);
  };

  const onMove = useCallback((e) => {
    if (dragging === null) return;
    e.preventDefault();
    const { cx, cy } = getPos(e);
    const norm    = toNorm(cx, cy);
    const isFirst = dragging === 0;
    const isLast  = dragging === points.length - 1;
    const newX    = isFirst ? 0 : isLast ? 1 : Math.max(0.01, Math.min(0.99, norm.x));
    const newY    = Math.max(0, Math.min(1, norm.y));

    setHoverPt({ x: newX, y: newY });
    const updated = points.map((pt, i) => i === dragging ? { x: newX, y: newY } : pt);
    updated.sort((a, b) => a.x - b.x);
    const newIdx = updated.findIndex(p => Math.abs(p.x - newX) < 1e-9 && Math.abs(p.y - newY) < 1e-9);
    if (newIdx !== dragging) setDragging(newIdx >= 0 ? newIdx : dragging);
    onChannelCurveChange(channel, updated);
  }, [dragging, points, channel, onChannelCurveChange]);

  const onUp = () => { setDragging(null); setHoverPt(null); };

  const onDblClick = (e) => {
    const { cx, cy } = getPos(e);
    const idx = nearestIdx(cx, cy);
    if (idx > 0 && idx < points.length - 1) {
      onChannelCurveChange(channel, points.filter((_, i) => i !== idx));
    }
  };

  return (
    <div>
      {/* Channel tabs — pill style */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: 10,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 8, padding: 3,
      }}>
        {Object.entries(CHANNEL_CONFIG).map(([key, ch]) => {
          const active = channel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              style={{
                flex: 1, padding: '5px 0',
                borderRadius: 6,
                border: 'none',
                background: active ? `rgba(${ch.rgb},0.20)` : 'transparent',
                color: active ? ch.color : 'rgba(180,180,220,0.45)',
                fontSize: 11, fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
                outline: active ? `1px solid rgba(${ch.rgb},0.35)` : '1px solid transparent',
              }}
            >
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          cursor: 'crosshair',
          borderRadius: 10,
          display: 'block',
          touchAction: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#0c0c1a',
        }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onMouseEnter={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onDoubleClick={onDblClick}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />

      {/* Hint */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', textAlign: 'center', marginTop: 6, letterSpacing: '0.04em' }}>
        클릭으로 점 추가 &nbsp;·&nbsp; 더블클릭으로 제거 &nbsp;·&nbsp; 드래그로 조정
      </div>
    </div>
  );
}

// ── Canvas rounded rect polyfill ─────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
