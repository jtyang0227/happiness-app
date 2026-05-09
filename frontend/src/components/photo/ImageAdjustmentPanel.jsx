import React from 'react';
import { COLORS } from '../../constants/colors';
import { DEFAULT_ADJUSTMENTS, DEFAULT_CURVE_POINTS, DEFAULT_EFFECTS } from '../../hooks/useImageAdjustments';
import CurveEditor from './CurveEditor';

const SLIDERS = [
  { key: 'exposure',   label: '노출',       icon: '☀',  min: -3,   max: 3,   step: 0.05 },
  { key: 'contrast',   label: '대비',       icon: '◑',  min: -100, max: 100, step: 1    },
  { key: 'highlights', label: '밝은 영역',  icon: '◻',  min: -100, max: 100, step: 1    },
  { key: 'shadows',    label: '어두운 영역', icon: '◼',  min: -100, max: 100, step: 1    },
  { key: 'whites',     label: '흰색 계열',  icon: '○',  min: -100, max: 100, step: 1    },
  { key: 'blacks',     label: '검정 계열',  icon: '●',  min: -100, max: 100, step: 1    },
];

const EFFECT_SLIDERS = [
  { key: 'texture', label: '텍스처',   icon: '◈', min: -100, max: 100, step: 1 },
  { key: 'clarity', label: '부분대비', icon: '◉', min: -100, max: 100, step: 1 },
  { key: 'dehaze',  label: '디헤이즈', icon: '◌', min: -100, max: 100, step: 1 },
];

const GRAIN_SLIDERS = [
  { key: 'grainAmount',    label: '그레인 농도', icon: '⠿', min: 0, max: 100, step: 1 },
  { key: 'grainSize',      label: '크기',        icon: '⊡', min: 1, max: 100, step: 1 },
  { key: 'grainRoughness', label: '거칠기',      icon: '⊞', min: 0, max: 100, step: 1 },
];

function fmt(def, val) {
  if (def.key === 'exposure') return val === 0 ? '0' : (val > 0 ? '+' : '') + val.toFixed(2);
  if (def.min >= 0) return String(val);
  return val === 0 ? '0' : (val > 0 ? '+' : '') + val;
}

function SliderRow({ def, value, onChange }) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const isCentered = def.min < 0;
  const fillLeft  = isCentered ? `${Math.min(50, pct)}%` : '0%';
  const fillWidth = isCentered ? `${Math.abs(pct - 50)}%` : `${pct}%`;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#9090b0', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10 }}>{def.icon}</span>
          {def.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: value === 0 ? '#5555aa' : COLORS.primary,
          minWidth: 36, textAlign: 'right',
        }}>
          {fmt(def, value)}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 3,
          background: '#1e1e3a', borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', left: fillLeft, width: fillWidth, height: 3,
          background: COLORS.primary, borderRadius: 2,
        }} />
        {isCentered && (
          <div style={{
            position: 'absolute', left: '50%', width: 1, height: 7,
            background: '#2a2a50', transform: 'translateX(-50%)',
          }} />
        )}
        <input
          type="range"
          min={def.min} max={def.max} step={def.step} value={value}
          onChange={e => onChange(def.key, Number(e.target.value))}
          style={{
            position: 'relative', width: '100%', margin: 0,
            appearance: 'none', background: 'transparent', cursor: 'pointer', height: 20,
          }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#6060a0',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginTop: 18, marginBottom: 8, paddingBottom: 4,
      borderBottom: '1px solid #1e1e3a',
    }}>
      {title}
    </div>
  );
}

export default function ImageAdjustmentPanel({ adjustments, onAdjust, curvePoints, onCurveChange, effects, onEffect }) {
  const hasChanges =
    Object.keys(DEFAULT_ADJUSTMENTS).some(k => adjustments[k] !== 0) ||
    curvePoints.length > 2 ||
    curvePoints[0]?.y !== 0 ||
    curvePoints[1]?.y !== 1 ||
    effects.texture !== 0 || effects.clarity !== 0 || effects.dehaze !== 0 ||
    effects.vignette !== 0 || effects.grainAmount !== 0;

  const handleReset = () => {
    Object.keys(DEFAULT_ADJUSTMENTS).forEach(k => onAdjust(k, 0));
    onCurveChange([...DEFAULT_CURVE_POINTS]);
    Object.keys(DEFAULT_EFFECTS).forEach(k => onEffect(k, DEFAULT_EFFECTS[k]));
  };

  return (
    <div style={{
      background: '#12122a',
      borderRadius: 12,
      padding: '14px 16px 16px',
      border: '1px solid #1e1e3a',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#eeeeff', fontWeight: 700, fontSize: 13 }}>사진 보정</span>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges}
          style={{
            fontSize: 11,
            color: hasChanges ? COLORS.accent : '#3a3a6e',
            background: 'none', border: 'none',
            cursor: hasChanges ? 'pointer' : 'default',
            fontWeight: 600, padding: '2px 6px',
          }}
        >
          초기화
        </button>
      </div>

      {/* 기본 보정 슬라이더 */}
      {SLIDERS.map(def => (
        <SliderRow key={def.key} def={def} value={adjustments[def.key]} onChange={onAdjust} />
      ))}

      {/* 곡선 */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: '#9090b0', marginBottom: 6 }}>
          곡선 — 클릭으로 추가, 더블클릭으로 제거
        </div>
        <CurveEditor points={curvePoints} onChange={onCurveChange} />
      </div>

      {/* 효과 */}
      <SectionHeader title="효과" />
      {EFFECT_SLIDERS.map(def => (
        <SliderRow key={def.key} def={def} value={effects[def.key]} onChange={onEffect} />
      ))}

      {/* 비네팅 */}
      <SectionHeader title="비네팅" />
      <SliderRow
        def={{ key: 'vignette', label: '농도', icon: '◎', min: -100, max: 100, step: 1 }}
        value={effects.vignette}
        onChange={onEffect}
      />

      {/* 그레인 */}
      <SectionHeader title="그레인" />
      {GRAIN_SLIDERS.map(def => (
        <SliderRow key={def.key} def={def} value={effects[def.key]} onChange={onEffect} />
      ))}
    </div>
  );
}
