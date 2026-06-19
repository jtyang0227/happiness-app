import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { COLORS } from '../../../constants/colors';

const FILTERS = [
  { name: 'none',      label: '없음',    labelEn: 'None' },
  { name: 'bw',        label: '흑백',    labelEn: 'B&W' },
  { name: 'vintage',   label: '빈티지',  labelEn: 'Vintage' },
  { name: 'cinematic', label: '시네마틱', labelEn: 'Cinematic' },
  { name: 'soft',      label: '소프트',  labelEn: 'Soft' },
  { name: 'vibrant',   label: '선명',    labelEn: 'Vibrant' },
  { name: 'warm',      label: '따뜻함',  labelEn: 'Warm' },
  { name: 'cool',      label: '차가움',  labelEn: 'Cool' },
];

// ── Filter engines ───────────────────────────────────────────────
function applyBW(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i]     = Math.round(g * t + data[i]     * (1 - t));
    data[i + 1] = Math.round(g * t + data[i + 1] * (1 - t));
    data[i + 2] = Math.round(g * t + data[i + 2] * (1 - t));
  }
}

function applyVintage(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const nr = Math.min(255, r * 0.9 + g * 0.1 + 20);
    const ng = Math.min(255, g * 0.85 + 10);
    const nb = Math.min(255, b * 0.75);
    data[i]     = Math.round(nr * t + r * (1 - t));
    data[i + 1] = Math.round(ng * t + g * (1 - t));
    data[i + 2] = Math.round(nb * t + b * (1 - t));
  }
}

function applyCinematic(data, intensity) {
  const t = intensity / 100;
  const sCurve = v => {
    const x = v / 255;
    const y = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    return Math.round(y * 255);
  };
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const nr = Math.min(255, sCurve(r) + 10);
    const ng = sCurve(g);
    const nb = Math.max(0, sCurve(b) - 10);
    data[i]     = Math.round(nr * t + r * (1 - t));
    data[i + 1] = Math.round(ng * t + g * (1 - t));
    data[i + 2] = Math.round(nb * t + b * (1 - t));
  }
}

function applySoft(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const nr = Math.min(255, r + 8);
    const ng = Math.min(255, g + 8);
    const nb = Math.min(255, b + 8);
    data[i]     = Math.round(nr * t + r * (1 - t));
    data[i + 1] = Math.round(ng * t + g * (1 - t));
    data[i + 2] = Math.round(nb * t + b * (1 - t));
  }
}

function applyVibrant(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const avg = (r + g + b) / 3;
    const nr = Math.min(255, avg + (r - avg) * 1.4);
    const ng = Math.min(255, avg + (g - avg) * 1.4);
    const nb = Math.min(255, avg + (b - avg) * 1.4);
    data[i]     = Math.round(nr * t + r * (1 - t));
    data[i + 1] = Math.round(ng * t + g * (1 - t));
    data[i + 2] = Math.round(nb * t + b * (1 - t));
  }
}

function applyWarm(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i]     + Math.round(20 * t));
    data[i + 2] = Math.max(0,   data[i + 2] - Math.round(15 * t));
  }
}

function applyCool(data, intensity) {
  const t = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 2] = Math.min(255, data[i + 2] + Math.round(20 * t));
    data[i]     = Math.max(0,   data[i]     - Math.round(15 * t));
  }
}

const ENGINE_MAP = {
  bw: applyBW, vintage: applyVintage, cinematic: applyCinematic,
  soft: applySoft, vibrant: applyVibrant, warm: applyWarm, cool: applyCool,
};

// ── Thumbnail card ───────────────────────────────────────────────
function FilterCard({ filter, objectUrl, selectedName, intensity, onSelect }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!objectUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.onload = () => {
      canvas.width  = 64;
      canvas.height = 64;
      ctx.drawImage(img, 0, 0, 64, 64);
      if (filter.name !== 'none') {
        const imgData = ctx.getImageData(0, 0, 64, 64);
        ENGINE_MAP[filter.name]?.(imgData.data, intensity);
        ctx.putImageData(imgData, 0, 0);
      }
    };
    img.src = objectUrl;
  }, [objectUrl, filter.name, intensity]);

  const isSelected = selectedName === filter.name;
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
        border: `2px solid ${isSelected ? COLORS.primary : 'transparent'}`,
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.15s, border-color 0.15s',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto' }} />
      {isSelected && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%',
          background: COLORS.primary, color: '#fff',
          fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✓</div>
      )}
      <div style={{
        padding: '3px 4px', fontSize: 9, fontWeight: 600, textAlign: 'center',
        background: COLORS.darkSurface, color: isSelected ? COLORS.primary : COLORS.darkTextSub,
      }}>
        {filter.label}
      </div>
    </div>
  );
}

export default function FilterPanel() {
  const { currentImage, currentEditState, dispatch } = useEditor();
  const { filter } = currentEditState;

  const update = patch => dispatch({ type: 'EDIT_UPDATE', patch: { filter: { ...filter, ...patch } } });

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <FilterCard
            key={f.name}
            filter={f}
            objectUrl={currentImage?.objectUrl}
            selectedName={filter.name}
            intensity={filter.intensity}
            onSelect={() => update({ name: f.name })}
          />
        ))}
      </div>

      {filter.name !== 'none' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>필터 강도</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary }}>{filter.intensity}</span>
          </div>
          <input
            type="range" min="0" max="100" step="1"
            value={filter.intensity}
            onChange={e => update({ intensity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer' }}
          />
        </div>
      )}
    </div>
  );
}
