import React, { useRef, useEffect } from 'react';
import { COLORS } from '../../constants/colors';

export default function DonutChart({ data = [], size = 160 }) {
  const canvasRef = useRef(null);
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.4;
    const innerR = size * 0.25;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = '#e2e2ee';
      ctx.fill();
      return;
    }

    let startAngle = -Math.PI / 2;
    data.forEach((d) => {
      const slice = (d.count / total) * (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color || COLORS.primary;
      ctx.fill();
      startAngle += slice;
    });

    // Inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.surface;
    ctx.fill();

    // Center text
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 ${Math.floor(size * 0.15)}px system-ui, sans-serif`;
    ctx.fillText(total.toLocaleString(), cx, cy - 2);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `${Math.floor(size * 0.09)}px system-ui, sans-serif`;
    ctx.fillText('장', cx, cy + Math.floor(size * 0.12));
  }, [data, size, total]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 100 }}>
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color || COLORS.primary, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted, flexShrink: 0 }}>{d.count}</span>
              <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0, width: 30, textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
        {data.length === 0 && (
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>데이터 없음</div>
        )}
      </div>
    </div>
  );
}
