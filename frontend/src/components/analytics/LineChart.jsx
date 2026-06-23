import React, { useRef, useEffect, useState } from 'react';

export default function LineChart({ data = [], color = '#5b6ef5', height = 180 }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [width, setWidth] = useState(300);

  // Observe parent width
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    obs.observe(el);
    setWidth(el.clientWidth || 300);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const PADDING = { top: 16, right: 12, bottom: 36, left: 40 };
    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const toX = (i) => PADDING.left + (i / (data.length - 1)) * chartW;
    const toY = (v) => PADDING.top + chartH - ((v - minVal) / range) * chartH;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + chartH);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < data.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(values[i - 1]), cpX, toY(values[i]), toX(i), toY(values[i]));
    }
    ctx.lineTo(toX(data.length - 1), PADDING.top + chartH);
    ctx.lineTo(PADDING.left, PADDING.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < data.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(values[i - 1]), cpX, toY(values[i]), toX(i), toY(values[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots
    data.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(d.value), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X-axis labels (show up to 7)
    ctx.fillStyle = '#9090b0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 7));
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== data.length - 1) return;
      const label = d.date ? String(d.date).slice(5) : `${i + 1}`;
      ctx.fillText(label, toX(i), height - 8);
    });

    // Y-axis labels (4 levels)
    ctx.textAlign = 'right';
    for (let l = 0; l <= 3; l++) {
      const v = minVal + (range * l) / 3;
      const y = toY(v);
      ctx.fillStyle = '#9090b0';
      ctx.fillText(Math.round(v).toLocaleString(), PADDING.left - 6, y + 3);
      ctx.beginPath();
      ctx.strokeStyle = '#e2e2ee';
      ctx.lineWidth = 0.5;
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + chartW, y);
      ctx.stroke();
    }
  }, [data, color, width, height]);

  return (
    <div ref={wrapperRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: height, display: 'block' }}
      />
    </div>
  );
}
