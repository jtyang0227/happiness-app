import React, { useRef, useEffect, useState, useCallback } from 'react';
import { catmullRomY } from '../../hooks/useImageAdjustments';

const CANVAS = 252;
const PAD    = 10;
const PLOT   = CANVAS - PAD * 2;
const HIT_R  = 14;
const DOT_R  = 5;

const CHANNEL_CONFIG = {
  rgb: { label: 'RGB', color: '#dde0ff', histKey: 'lum', rgb: '160,160,220' },
  r:   { label: 'R',   color: '#ff6060', histKey: 'r',   rgb: '255,80,80'   },
  g:   { label: 'G',   color: '#50d870', histKey: 'g',   rgb: '60,210,100'  },
  b:   { label: 'B',   color: '#5899ff', histKey: 'b',   rgb: '80,148,255'  },
};

function toCanvas(pt) {
  return {
    cx: PAD + pt.x * PLOT,
    cy: PAD + (1 - pt.y) * PLOT,
  };
}

function toNorm(cx, cy) {
  return {
    x: Math.max(0, Math.min(1, (cx - PAD) / PLOT)),
    y: Math.max(0, Math.min(1, 1 - (cy - PAD) / PLOT)),
  };
}

/**
 * Lightroom 스타일 채널별 톤 커브 에디터.
 *
 * props:
 *   channelCurves        — { rgb, r, g, b } 각각 [{x,y}] 배열
 *   onChannelCurveChange — (channel: 'rgb'|'r'|'g'|'b', points) => void
 *   histogram            — { r, g, b, lum } Uint32Array(256) 또는 null
 */
export default function CurveEditor({ channelCurves, onChannelCurveChange, histogram }) {
  const canvasRef      = useRef(null);
  const [channel, setChannel] = useState('rgb');
  const [dragging, setDragging] = useState(null);
  const [hoverPt, setHoverPt]   = useState(null);  // { x, y } norm — 드래그 중 좌표

  const cfg    = CHANNEL_CONFIG[channel];
  const points = channelCurves?.[channel] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  // ── 히스토그램 그리기 ─────────────────────────────────────────────
  const drawHistogram = useCallback((ctx) => {
    if (!histogram) return;
    const data = histogram[cfg.histKey];
    if (!data) return;

    // log 스케일로 normalization (시각적으로 더 보기 좋음)
    const max = Math.max(...data);
    if (!max) return;

    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = PAD + (i / 255) * PLOT;
      const logH = data[i] > 0 ? Math.log1p(data[i]) / Math.log1p(max) : 0;
      const h = logH * PLOT;
      const y = PAD + PLOT - h;
      if (i === 0) { ctx.moveTo(PAD, PAD + PLOT); ctx.lineTo(x, y); }
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(PAD + PLOT, PAD + PLOT);
    ctx.closePath();
    ctx.fillStyle = `rgba(${cfg.rgb},0.13)`;
    ctx.fill();
  }, [histogram, cfg]);

  // ── 캔버스 그리기 ─────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 배경
    ctx.fillStyle = '#0c0c1e';
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    // 히스토그램
    drawHistogram(ctx);

    // 4분할 그리드
    ctx.strokeStyle = '#181830';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const o = PAD + (PLOT / 4) * i;
      ctx.beginPath(); ctx.moveTo(o, PAD); ctx.lineTo(o, PAD + PLOT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, o); ctx.lineTo(PAD + PLOT, o); ctx.stroke();
    }

    // 테두리
    ctx.strokeStyle = '#22224a';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, PLOT, PLOT);

    // Identity 대각선
    ctx.strokeStyle = '#282850';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + PLOT);
    ctx.lineTo(PAD + PLOT, PAD);
    ctx.stroke();
    ctx.setLineDash([]);

    // 커브 아래 영역 채우기
    const sorted = [...points].sort((a, b) => a.x - b.x);
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + PLOT);
    for (let i = 0; i <= PLOT; i++) {
      const nx = i / PLOT;
      const ny = catmullRomY(nx, sorted);
      ctx.lineTo(PAD + nx * PLOT, PAD + (1 - ny) * PLOT);
    }
    ctx.lineTo(PAD + PLOT, PAD + PLOT);
    ctx.closePath();
    ctx.fillStyle = `rgba(${cfg.rgb},0.07)`;
    ctx.fill();

    // 커브 선
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 4;
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
    ctx.shadowBlur = 0;

    // 제어점
    points.forEach((pt, idx) => {
      const { cx, cy } = toCanvas(pt);
      const active = dragging === idx;

      if (active) {
        ctx.beginPath();
        ctx.arc(cx, cy, DOT_R + 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cfg.rgb},0.18)`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = active ? cfg.color : 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 드래그 중 좌표 오버레이
    if (dragging !== null && hoverPt) {
      const inV  = Math.round(hoverPt.x * 255);
      const outV = Math.round(hoverPt.y * 255);
      const text = `In ${inV}  Out ${outV}`;
      ctx.font = '10px monospace';
      const tw = ctx.measureText(text).width;
      const bx = PAD + 4;
      const by = PAD + 4;
      ctx.fillStyle = 'rgba(8,8,24,0.8)';
      ctx.fillRect(bx - 2, by, tw + 8, 15);
      ctx.fillStyle = cfg.color;
      ctx.fillText(text, bx + 2, by + 11);
    }
  }, [points, dragging, hoverPt, cfg, drawHistogram]);

  useEffect(() => { draw(); }, [draw]);

  // ── 이벤트 헬퍼 ──────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      cx: (src.clientX - rect.left) * (CANVAS / rect.width),
      cy: (src.clientY - rect.top)  * (CANVAS / rect.height),
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

  // ── 마우스 / 터치 ─────────────────────────────────────────────────
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
      {/* 채널 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {Object.entries(CHANNEL_CONFIG).map(([key, ch]) => {
          const active = channel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 6,
                border: `1.5px solid ${active ? ch.color : '#22224a'}`,
                background: active ? `rgba(${ch.rgb},0.15)` : 'transparent',
                color: active ? ch.color : '#44446a',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={CANVAS}
        height={CANVAS}
        style={{
          width: '100%',
          cursor: 'crosshair',
          borderRadius: 8,
          display: 'block',
          touchAction: 'none',
          border: '1px solid #1a1a38',
        }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onDoubleClick={onDblClick}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />

      {/* 안내 */}
      <div style={{ fontSize: 10, color: '#404060', textAlign: 'center', marginTop: 5 }}>
        클릭 추가 &nbsp;·&nbsp; 더블클릭 제거 &nbsp;·&nbsp; 드래그 조정
      </div>
    </div>
  );
}
