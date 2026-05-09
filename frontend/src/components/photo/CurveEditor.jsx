import React, { useRef, useEffect, useState, useCallback } from 'react';
import { catmullRomY } from '../../hooks/useImageAdjustments';

const CANVAS  = 214;   // 캔버스 px
const PAD     = 7;     // 여백
const PLOT    = CANVAS - PAD * 2;  // 200px 플롯 영역
const HIT_R   = 12;   // 히트 반경
const DOT_R   = 5;    // 제어점 반지름
const PRIMARY = '#5b6ef5';

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

export default function CurveEditor({ points, onChange }) {
  const canvasRef  = useRef(null);
  const [dragging, setDragging] = useState(null);

  // ── 렌더링 ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS, CANVAS);

    // 배경
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    // 그리드 (4×4)
    ctx.strokeStyle = '#1e1e3a';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const ox = PAD + (PLOT / 4) * i;
      const oy = PAD + (PLOT / 4) * i;
      ctx.beginPath(); ctx.moveTo(ox, PAD); ctx.lineTo(ox, PAD + PLOT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, oy); ctx.lineTo(PAD + PLOT, oy); ctx.stroke();
    }

    // 대각선 (identity 참조선)
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + PLOT);
    ctx.lineTo(PAD + PLOT, PAD);
    ctx.stroke();
    ctx.setLineDash([]);

    // 커브
    const sorted = [...points].sort((a, b) => a.x - b.x);
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= PLOT; i++) {
      const x  = i / PLOT;
      const y  = catmullRomY(x, sorted);
      const cx = PAD + x * PLOT;
      const cy = PAD + (1 - y) * PLOT;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // 제어점
    points.forEach((pt, idx) => {
      const { cx, cy } = toCanvas(pt);
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = dragging === idx ? PRIMARY : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = PRIMARY;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, dragging]);

  useEffect(() => { draw(); }, [draw]);

  // ── 이벤트 헬퍼 ───────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      cx: (clientX - rect.left) * (CANVAS / rect.width),
      cy: (clientY - rect.top)  * (CANVAS / rect.height),
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
      return;
    }
    // 새 제어점 추가 (양 끝점은 추가 금지)
    const norm = toNorm(cx, cy);
    if (norm.x <= 0.01 || norm.x >= 0.99) return;
    const newPts = [...points, norm].sort((a, b) => a.x - b.x);
    const newIdx = newPts.findIndex(p => p.x === norm.x && p.y === norm.y);
    onChange(newPts);
    setDragging(newIdx >= 0 ? newIdx : newPts.length - 1);
  };

  const onMove = useCallback((e) => {
    if (dragging === null) return;
    e.preventDefault();
    const { cx, cy } = getPos(e);
    const norm = toNorm(cx, cy);

    const isFirst = dragging === 0;
    const isLast  = dragging === points.length - 1;
    const newX = isFirst ? 0 : isLast ? 1 : Math.max(0.01, Math.min(0.99, norm.x));
    const newY = Math.max(0, Math.min(1, norm.y));

    const updated = points.map((pt, i) => i === dragging ? { x: newX, y: newY } : pt);
    updated.sort((a, b) => a.x - b.x);

    // dragging 인덱스 재계산 (정렬 후 위치 변경 가능)
    const newIdx = updated.findIndex(p => Math.abs(p.x - newX) < 1e-9 && Math.abs(p.y - newY) < 1e-9);
    if (newIdx !== dragging) setDragging(newIdx >= 0 ? newIdx : dragging);

    onChange(updated);
  }, [dragging, points, onChange]);

  const onUp = () => setDragging(null);

  const onDblClick = (e) => {
    const { cx, cy } = getPos(e);
    const idx = nearestIdx(cx, cy);
    // 양 끝점은 제거 불가
    if (idx > 0 && idx < points.length - 1) {
      onChange(points.filter((_, i) => i !== idx));
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS}
      height={CANVAS}
      style={{ width: '100%', cursor: 'crosshair', borderRadius: 8, display: 'block', touchAction: 'none' }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onDoubleClick={onDblClick}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
    />
  );
}
