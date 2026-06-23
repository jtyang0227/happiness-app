import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import {
  DEFAULT_ADJUSTMENTS, DEFAULT_CHANNEL_CURVES, DEFAULT_EFFECTS,
  DEFAULT_HSL_ADJUSTMENTS, DEFAULT_COLOR_GRADING, DEFAULT_SHARPENING, DEFAULT_NOISE_REDUCTION,
} from '../../hooks/useImageAdjustments';
import CurveEditor from './CurveEditor';
import PresetManager from './PresetManager';

// ── Slider definitions ───────────────────────────────────────────────

const BASIC_SLIDERS = [
  { key: 'exposure',   label: '노출',        icon: '☀',  min: -3,   max: 3,   step: 0.05 },
  { key: 'contrast',   label: '대비',        icon: '◑',  min: -100, max: 100, step: 1    },
  { key: 'highlights', label: '밝은 영역',   icon: '◻',  min: -100, max: 100, step: 1    },
  { key: 'shadows',    label: '어두운 영역', icon: '◼',  min: -100, max: 100, step: 1    },
  { key: 'whites',     label: '흰색 계열',   icon: '○',  min: -100, max: 100, step: 1    },
  { key: 'blacks',     label: '검정 계열',   icon: '●',  min: -100, max: 100, step: 1    },
];

const WB_SLIDERS = [
  { key: 'temperature', label: '색온도', icon: '◈', min: -100, max: 100, step: 1 },
  { key: 'tint',        label: '색조',   icon: '◇', min: -100, max: 100, step: 1 },
];

const COLOR_SLIDERS = [
  { key: 'vibrance',   label: '바이브런스', icon: '◉', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: '채도',       icon: '◎', min: -100, max: 100, step: 1 },
];

const EFFECT_SLIDERS = [
  { key: 'texture', label: '텍스처',    icon: '◈', min: -100, max: 100, step: 1 },
  { key: 'clarity', label: '부분 대비', icon: '◉', min: -100, max: 100, step: 1 },
  { key: 'dehaze',  label: '디헤이즈',  icon: '◌', min: -100, max: 100, step: 1 },
];

const GRAIN_SLIDERS = [
  { key: 'grainAmount',    label: '그레인 농도', icon: '⠿', min: 0, max: 100, step: 1 },
  { key: 'grainSize',      label: '크기',        icon: '⊡', min: 1, max: 100, step: 1 },
  { key: 'grainRoughness', label: '거칠기',      icon: '⊞', min: 0, max: 100, step: 1 },
];

const HSL_COLORS = [
  { key: 'red',     label: '빨강', dot: '#ff4444' },
  { key: 'orange',  label: '주황', dot: '#ff8800' },
  { key: 'yellow',  label: '노랑', dot: '#ffdd00' },
  { key: 'green',   label: '초록', dot: '#44cc44' },
  { key: 'aqua',    label: '청록', dot: '#00cccc' },
  { key: 'blue',    label: '파랑', dot: '#4488ff' },
  { key: 'purple',  label: '보라', dot: '#aa44ff' },
  { key: 'magenta', label: '마젠타', dot: '#ff44aa' },
];

const CG_ZONES = [
  { key: 'shadows',    label: '어두운 영역' },
  { key: 'midtones',   label: '중간 영역' },
  { key: 'highlights', label: '밝은 영역' },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(def, val) {
  if (def.key === 'exposure') return val === 0 ? '0' : (val > 0 ? '+' : '') + val.toFixed(2);
  if (def.min >= 0) return String(val);
  return val === 0 ? '0' : (val > 0 ? '+' : '') + val;
}

function isDefaultChannelCurves(cc) {
  if (!cc) return true;
  for (const ch of ['rgb', 'r', 'g', 'b']) {
    const pts = cc[ch];
    if (!pts || pts.length !== 2) return false;
    if (pts[0].x !== 0 || pts[0].y !== 0) return false;
    if (pts[1].x !== 1 || pts[1].y !== 1) return false;
  }
  return true;
}

// ── SliderRow ────────────────────────────────────────────────────────

function SliderRow({ def, value, onChange }) {
  const pct        = ((value - def.min) / (def.max - def.min)) * 100;
  const isCentered = def.min < 0;
  const fillLeft   = isCentered ? `${Math.min(50, pct)}%` : '0%';
  const fillWidth  = isCentered ? `${Math.abs(pct - 50)}%` : `${pct}%`;
  const changed    = value !== (def.defaultVal ?? 0);

  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: changed ? 'rgba(200,200,255,0.75)' : 'rgba(140,140,180,0.55)', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.02em' }}>
          <span style={{ fontSize: 9, opacity: 0.7 }}>{def.icon}</span>
          {def.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: changed ? '#a0aaff' : 'rgba(90,90,140,0.70)',
          minWidth: 36, textAlign: 'right', letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(def, value)}
        </span>
      </div>
      <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: fillLeft, width: fillWidth, height: 2, background: 'linear-gradient(90deg,#7060ff,#a090ff)', borderRadius: 2, opacity: changed ? 1 : 0.5 }} />
        {isCentered && (
          <div style={{ position: 'absolute', left: '50%', width: 1, height: 8, background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)' }} />
        )}
        <input
          type="range"
          min={def.min} max={def.max} step={def.step} value={value}
          onChange={e => onChange(def.key, Number(e.target.value))}
          style={{ position: 'relative', width: '100%', margin: 0, appearance: 'none', background: 'transparent', cursor: 'pointer', height: 22 }}
        />
      </div>
    </div>
  );
}

// ── Section accordion ────────────────────────────────────────────────

function Section({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 4 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', padding: '8px 0 7px',
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.04)',
          userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge && (
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#8090ff', flexShrink: 0, marginLeft: 1 }} />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: badge ? 'rgba(200,205,255,0.80)' : 'rgba(130,130,170,0.65)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>{title}</span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(130,130,170,0.50)', transition: 'transform 0.2s', display: 'block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>
      {open && <div style={{ marginTop: 10, paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

// ── HSL color channel row ────────────────────────────────────────────

function HSLChannelRow({ colorDef, value, onChange }) {
  const { key, label, dot } = colorDef;
  const [expanded, setExpanded] = useState(false);
  const hasChange = value.hue !== 0 || value.saturation !== 0 || value.luminance !== 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: hasChange ? '#c0c0e0' : '#6060a0', flex: 1 }}>{label}</span>
        {hasChange && <span style={{ fontSize: 9, color: COLORS.primary }}>●</span>}
        <span style={{ fontSize: 9, color: '#404060' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 14, paddingTop: 2 }}>
          {[
            { sub: 'hue',        label: '색조',   icon: '↻', min: -60, max: 60, step: 1 },
            { sub: 'saturation', label: '채도',   icon: '◎', min: -100, max: 100, step: 1 },
            { sub: 'luminance',  label: '밝기',   icon: '☀', min: -100, max: 100, step: 1 },
          ].map(s => (
            <SliderRow
              key={s.sub}
              def={{ key: s.sub, label: s.label, icon: s.icon, min: s.min, max: s.max, step: s.step }}
              value={value[s.sub]}
              onChange={(_, v) => onChange(key, s.sub, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color Grading Zone ───────────────────────────────────────────────

function CGZone({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#6060a0', marginBottom: 6 }}>{label}</div>
      <div style={{ paddingLeft: 8 }}>
        <SliderRow
          def={{ key: 'hue',        label: '색조',   icon: '↻', min: 0, max: 360, step: 1, defaultVal: 0 }}
          value={value.hue}
          onChange={(_, v) => onChange('hue', v)}
        />
        <SliderRow
          def={{ key: 'saturation', label: '채도',   icon: '◎', min: 0, max: 100, step: 1, defaultVal: 0 }}
          value={value.saturation}
          onChange={(_, v) => onChange('saturation', v)}
        />
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────

/**
 * props:
 *   adjustments, onAdjust
 *   channelCurves, onChannelCurveChange
 *   effects, onEffect
 *   hslAdj, onHSLChange
 *   colorGrading, onColorGradingChange
 *   sharpening, onSharpeningChange
 *   noiseReduction, onNoiseReductionChange
 *   calibration, onCalibrationChange
 *   histogram
 *   onApplyPreset
 *   onFullReset
 */
export default function ImageAdjustmentPanel({
  adjustments,
  onAdjust,
  channelCurves,
  onChannelCurveChange,
  effects,
  onEffect,
  hslAdj,
  onHSLChange,
  colorGrading,
  onColorGradingChange,
  sharpening,
  onSharpeningChange,
  noiseReduction,
  onNoiseReductionChange,
  calibration,
  onCalibrationChange,
  histogram,
  onApplyPreset,
  onFullReset,
}) {
  const hasBasic   = Object.keys(DEFAULT_ADJUSTMENTS).some(k => (adjustments[k] ?? 0) !== 0);
  const hasWB      = (adjustments.temperature || 0) !== 0 || (adjustments.tint || 0) !== 0;
  const hasColor   = (effects.vibrance || 0) !== 0 || (effects.saturation || 0) !== 0;
  const hasCurves  = !isDefaultChannelCurves(channelCurves);
  const hasHSL     = hslAdj && Object.values(hslAdj).some(ch => ch.hue !== 0 || ch.saturation !== 0 || ch.luminance !== 0);
  const hasCG      = colorGrading && CG_ZONES.some(z => colorGrading[z.key]?.saturation > 0);
  const hasSharp   = sharpening && sharpening.amount > 0;
  const hasNR      = noiseReduction && (noiseReduction.luminance > 0 || noiseReduction.color > 0);
  const hasEffects = effects.texture !== 0 || effects.clarity !== 0 || effects.dehaze !== 0 || effects.vignette !== 0 || effects.grainAmount !== 0;

  const hasAnyChange = hasBasic || hasWB || hasColor || hasCurves || hasHSL || hasCG || hasSharp || hasNR || hasEffects;

  const handleReset = () => {
    if (onFullReset) { onFullReset(); return; }
    Object.keys(DEFAULT_ADJUSTMENTS).forEach(k => onAdjust(k, DEFAULT_ADJUSTMENTS[k] ?? 0));
    Object.keys(DEFAULT_CHANNEL_CURVES).forEach(ch =>
      onChannelCurveChange(ch, [...DEFAULT_CHANNEL_CURVES[ch]])
    );
    Object.keys(DEFAULT_EFFECTS).forEach(k => onEffect(k, DEFAULT_EFFECTS[k]));
    if (onHSLChange) {
      Object.keys(DEFAULT_HSL_ADJUSTMENTS).forEach(c =>
        Object.keys(DEFAULT_HSL_ADJUSTMENTS[c]).forEach(s =>
          onHSLChange(c, s, 0)
        )
      );
    }
  };

  return (
    <div style={{ background: '#0e0e1e', borderRadius: 12, padding: '12px 14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'rgba(230,230,255,0.90)', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>사진 보정</span>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasAnyChange}
          style={{
            fontSize: 10, letterSpacing: '0.04em',
            color: hasAnyChange ? 'rgba(160,160,255,0.80)' : 'rgba(80,80,120,0.50)',
            background: 'none', border: 'none',
            cursor: hasAnyChange ? 'pointer' : 'default',
            fontWeight: 600, padding: '3px 8px',
            borderRadius: 6,
            background: hasAnyChange ? 'rgba(100,100,255,0.08)' : 'none',
          }}
        >
          초기화
        </button>
      </div>

      {/* 기본 보정 */}
      <Section title="기본 보정" badge={hasBasic} defaultOpen>
        {BASIC_SLIDERS.map(def => (
          <SliderRow key={def.key} def={def} value={adjustments[def.key] ?? 0} onChange={onAdjust} />
        ))}
      </Section>

      {/* 화이트 밸런스 (A1) */}
      <Section title="화이트 밸런스" badge={hasWB}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
          {[
            { label: '맑음', temp: 15, tint: 0 },
            { label: '흐림', temp: 25, tint: 5 },
            { label: '형광', temp: -15, tint: -10 },
            { label: '텅스텐', temp: -30, tint: 0 },
          ].map(wb => (
            <button key={wb.label} type="button"
              onClick={() => { onAdjust('temperature', wb.temp); onAdjust('tint', wb.tint); }}
              style={{
                flex: 1, padding: '5px 2px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(160,160,200,0.65)', cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >{wb.label}</button>
          ))}
        </div>
        {WB_SLIDERS.map(def => (
          <SliderRow key={def.key} def={def} value={adjustments[def.key] ?? 0} onChange={onAdjust} />
        ))}
      </Section>

      {/* 색상 (A2) */}
      <Section title="색상" badge={hasColor}>
        {COLOR_SLIDERS.map(def => (
          <SliderRow key={def.key} def={def} value={effects[def.key] ?? 0} onChange={onEffect} />
        ))}
      </Section>

      {/* 톤 커브 */}
      <Section title="톤 커브" badge={hasCurves}>
        <CurveEditor
          channelCurves={channelCurves}
          onChannelCurveChange={onChannelCurveChange}
          histogram={histogram}
        />
      </Section>

      {/* HSL 패널 (A3) */}
      <Section title="HSL / 색조 선택" badge={hasHSL}>
        {hslAdj && HSL_COLORS.map(colorDef => (
          <HSLChannelRow
            key={colorDef.key}
            colorDef={colorDef}
            value={hslAdj[colorDef.key]}
            onChange={(colorKey, subKey, val) => onHSLChange && onHSLChange(colorKey, subKey, val)}
          />
        ))}
      </Section>

      {/* 색 보정 (B1) */}
      <Section title="색 보정" badge={hasCG}>
        {colorGrading && CG_ZONES.map(zone => (
          <CGZone
            key={zone.key}
            label={zone.label}
            value={colorGrading[zone.key]}
            onChange={(subKey, val) => onColorGradingChange && onColorGradingChange(zone.key, subKey, val)}
          />
        ))}
        {colorGrading && (
          <SliderRow
            def={{ key: 'blending', label: '혼합', icon: '⊕', min: 0, max: 100, step: 1, defaultVal: 50 }}
            value={colorGrading.blending ?? 50}
            onChange={(_, v) => onColorGradingChange && onColorGradingChange('blending', null, v)}
          />
        )}
      </Section>

      {/* 선명도 (C1) */}
      <Section title="선명도" badge={hasSharp}>
        {sharpening && [
          { key: 'amount', label: '양', icon: '◈', min: 0, max: 150, step: 1, defaultVal: 0 },
          { key: 'radius', label: '반경', icon: '◉', min: 0.5, max: 3, step: 0.1, defaultVal: 1 },
          { key: 'detail', label: '엣지 마스킹', icon: '◌', min: 0, max: 100, step: 1, defaultVal: 25 },
        ].map(def => (
          <SliderRow key={def.key} def={def} value={sharpening[def.key] ?? def.defaultVal} onChange={(_, v) => onSharpeningChange && onSharpeningChange(def.key, v)} />
        ))}
      </Section>

      {/* 노이즈 제거 (C2) */}
      <Section title="노이즈 제거" badge={hasNR}>
        {noiseReduction && [
          { key: 'luminance', label: '밝기 노이즈', icon: '◎', min: 0, max: 100, step: 1, defaultVal: 0 },
          { key: 'color',     label: '색상 노이즈', icon: '◈', min: 0, max: 100, step: 1, defaultVal: 0 },
        ].map(def => (
          <SliderRow key={def.key} def={def} value={noiseReduction[def.key] ?? 0} onChange={(_, v) => onNoiseReductionChange && onNoiseReductionChange(def.key, v)} />
        ))}
      </Section>

      {/* 효과 */}
      <Section title="효과" badge={hasEffects}>
        {EFFECT_SLIDERS.map(def => (
          <SliderRow key={def.key} def={def} value={effects[def.key] ?? 0} onChange={onEffect} />
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', margin: '10px 0 6px', letterSpacing: '0.06em' }}>비네팅</div>
        <SliderRow
          def={{ key: 'vignette', label: '농도', icon: '◎', min: -100, max: 100, step: 1 }}
          value={effects.vignette ?? 0}
          onChange={onEffect}
        />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', margin: '10px 0 6px', letterSpacing: '0.06em' }}>그레인</div>
        {GRAIN_SLIDERS.map(def => (
          <SliderRow key={def.key} def={def} value={effects[def.key] ?? (def.key === 'grainSize' ? 25 : def.key === 'grainRoughness' ? 50 : 0)} onChange={onEffect} />
        ))}
      </Section>

      {/* 프리셋 (D3) */}
      <Section title="프리셋">
        <PresetManager
          adjustments={adjustments}
          channelCurves={channelCurves}
          effects={effects}
          hslAdj={hslAdj}
          colorGrading={colorGrading}
          sharpening={sharpening}
          noiseReduction={noiseReduction}
          calibration={calibration}
          onApply={onApplyPreset}
        />
      </Section>
    </div>
  );
}
