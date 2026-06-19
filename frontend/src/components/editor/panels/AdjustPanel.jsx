import React, { useState, useRef, useCallback } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { COLORS } from '../../../constants/colors';
import {
  DEFAULT_ADJUSTMENTS, DEFAULT_EFFECTS,
  DEFAULT_HSL_ADJUSTMENTS, DEFAULT_COLOR_GRADING,
  DEFAULT_SHARPENING, DEFAULT_NOISE_REDUCTION,
} from '../../../hooks/useImageAdjustments';

const HSL_COLORS = [
  { key: 'red',     label: '빨강', dot: '#e53e3e' },
  { key: 'orange',  label: '주황', dot: '#f59e0b' },
  { key: 'yellow',  label: '노랑', dot: '#ecc94b' },
  { key: 'green',   label: '초록', dot: '#48bb78' },
  { key: 'aqua',    label: '하늘', dot: '#4fd1c5' },
  { key: 'blue',    label: '파랑', dot: '#4299e1' },
  { key: 'purple',  label: '보라', dot: '#9f7aea' },
  { key: 'magenta', label: '마젠타', dot: '#ed64a6' },
];

const GRADE_ZONES = ['shadows', 'midtones', 'highlights'];
const GRADE_LABELS = { shadows: '쉐도우', midtones: '미드톤', highlights: '하이라이트' };

function Section({ title, changed, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${COLORS.darkBorder}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'none', border: 'none',
          color: COLORS.darkText, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <span>
          {changed && <span style={{ color: COLORS.primary, marginRight: 4, fontSize: 8 }}>●</span>}
          {title}
        </span>
        <span style={{ fontSize: 10, color: COLORS.darkTextHint }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, trackGradient }) {
  const timerRef = useRef(null);
  const changed  = value !== 0;

  const handleChange = useCallback(val => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 80);
  }, [onChange]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>
          {changed && <span style={{ color: COLORS.primary, marginRight: 3, fontSize: 7 }}>●</span>}
          {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: changed ? COLORS.primary : COLORS.darkTextHint }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => handleChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
        style={{
          width: '100%', accentColor: COLORS.primary, cursor: 'pointer',
          background: trackGradient
            ? `linear-gradient(to right, ${trackGradient})`
            : undefined,
        }}
      />
    </div>
  );
}

export default function AdjustPanel() {
  const { currentEditState, dispatch } = useEditor();
  const { adjustments, effects, hslAdj, colorGrading, sharpening, noiseReduction } = currentEditState;
  const [hslColor, setHslColor] = useState('red');

  const updateAdj   = patch => dispatch({ type: 'EDIT_UPDATE', patch: { adjustments: { ...adjustments, ...patch } } });
  const updateFx    = patch => dispatch({ type: 'EDIT_UPDATE', patch: { effects: { ...effects, ...patch } } });
  const updateHsl   = patch => dispatch({ type: 'EDIT_UPDATE', patch: { hslAdj: { ...hslAdj, ...patch } } });
  const updateGrade = (zone, key, val) => dispatch({
    type: 'EDIT_UPDATE',
    patch: { colorGrading: { ...colorGrading, [zone]: { ...colorGrading[zone], [key]: val } } },
  });
  const updateSharp = patch => dispatch({ type: 'EDIT_UPDATE', patch: { sharpening: { ...sharpening, ...patch } } });
  const updateNR    = patch => dispatch({ type: 'EDIT_UPDATE', patch: { noiseReduction: { ...noiseReduction, ...patch } } });

  const isAdjChanged  = JSON.stringify(adjustments)   !== JSON.stringify(DEFAULT_ADJUSTMENTS);
  const isFxChanged   = JSON.stringify(effects)       !== JSON.stringify(DEFAULT_EFFECTS);
  const isHslChanged  = JSON.stringify(hslAdj)        !== JSON.stringify(DEFAULT_HSL_ADJUSTMENTS);
  const isGradeChanged= JSON.stringify(colorGrading)  !== JSON.stringify(DEFAULT_COLOR_GRADING);
  const isSharpChanged= JSON.stringify(sharpening)    !== JSON.stringify(DEFAULT_SHARPENING);
  const isNRChanged   = JSON.stringify(noiseReduction)!== JSON.stringify(DEFAULT_NOISE_REDUCTION);

  return (
    <div style={{ overflowY: 'auto' }}>
      {/* 기본 보정 */}
      <Section title="기본 보정" changed={isAdjChanged}>
        <Slider label="노출" value={adjustments.exposure}   min={-3} max={3} step={0.05} onChange={v => updateAdj({ exposure: v })} trackGradient="#000,#fff" />
        <Slider label="대비" value={adjustments.contrast}   min={-100} max={100} onChange={v => updateAdj({ contrast: v })} />
        <Slider label="하이라이트" value={adjustments.highlights} min={-100} max={100} onChange={v => updateAdj({ highlights: v })} />
        <Slider label="쉐도우"     value={adjustments.shadows}    min={-100} max={100} onChange={v => updateAdj({ shadows: v })} />
        <Slider label="화이트"     value={adjustments.whites}     min={-100} max={100} onChange={v => updateAdj({ whites: v })} />
        <Slider label="블랙"       value={adjustments.blacks}     min={-100} max={100} onChange={v => updateAdj({ blacks: v })} />
        <Slider label="색온도" value={adjustments.temperature} min={-100} max={100} onChange={v => updateAdj({ temperature: v })} trackGradient="#88aaff,#ffaa44" />
        <Slider label="색조"   value={adjustments.tint}        min={-100} max={100} onChange={v => updateAdj({ tint: v })} trackGradient="#44cc88,#cc44bb" />
      </Section>

      {/* 효과 */}
      <Section title="효과" changed={isFxChanged} defaultOpen={false}>
        <Slider label="바이브런스" value={effects.vibrance}   min={-100} max={100} onChange={v => updateFx({ vibrance: v })} />
        <Slider label="채도"       value={effects.saturation} min={-100} max={100} onChange={v => updateFx({ saturation: v })} />
        <Slider label="선명도"     value={effects.clarity}    min={-100} max={100} onChange={v => updateFx({ clarity: v })} />
        <Slider label="텍스처"     value={effects.texture}    min={-100} max={100} onChange={v => updateFx({ texture: v })} />
        <Slider label="안개 제거"  value={effects.dehaze}     min={-100} max={100} onChange={v => updateFx({ dehaze: v })} />
        <Slider label="비네팅"     value={effects.vignette}   min={-100} max={100} onChange={v => updateFx({ vignette: v })} />
        <Slider label="그레인"     value={effects.grainAmount} min={0} max={100} onChange={v => updateFx({ grainAmount: v })} />
      </Section>

      {/* HSL */}
      <Section title="HSL" changed={isHslChanged} defaultOpen={false}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {HSL_COLORS.map(c => (
            <button
              key={c.key}
              onClick={() => setHslColor(c.key)}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: `2px solid ${hslColor === c.key ? '#fff' : 'transparent'}`,
                background: c.dot, cursor: 'pointer',
              }}
              title={c.label}
            />
          ))}
        </div>
        {hslAdj[hslColor] && (
          <>
            <Slider label="색조"     value={hslAdj[hslColor].hue}        min={-100} max={100} onChange={v => updateHsl({ [hslColor]: { ...hslAdj[hslColor], hue: v } })} />
            <Slider label="채도"     value={hslAdj[hslColor].saturation} min={-100} max={100} onChange={v => updateHsl({ [hslColor]: { ...hslAdj[hslColor], saturation: v } })} />
            <Slider label="밝기"     value={hslAdj[hslColor].luminance}  min={-100} max={100} onChange={v => updateHsl({ [hslColor]: { ...hslAdj[hslColor], luminance: v } })} />
          </>
        )}
      </Section>

      {/* 색 보정 */}
      <Section title="색 보정" changed={isGradeChanged} defaultOpen={false}>
        {GRADE_ZONES.map(zone => (
          <div key={zone} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.darkTextSub, marginBottom: 6 }}>{GRADE_LABELS[zone]}</div>
            <Slider label="색조"  value={colorGrading[zone]?.hue ?? 0}        min={0}    max={360} onChange={v => updateGrade(zone, 'hue', v)} />
            <Slider label="채도"  value={colorGrading[zone]?.saturation ?? 0} min={0}    max={100} onChange={v => updateGrade(zone, 'saturation', v)} />
          </div>
        ))}
        <Slider label="블렌딩" value={colorGrading.blending ?? 50} min={0} max={100} onChange={v => dispatch({ type: 'EDIT_UPDATE', patch: { colorGrading: { ...colorGrading, blending: v } } })} />
      </Section>

      {/* 선명도 */}
      <Section title="선명도" changed={isSharpChanged} defaultOpen={false}>
        <Slider label="강도"   value={sharpening.amount} min={0}   max={150} onChange={v => updateSharp({ amount: v })} />
        <Slider label="반경"   value={sharpening.radius} min={0.5} max={3}   step={0.1} onChange={v => updateSharp({ radius: v })} />
        <Slider label="디테일" value={sharpening.detail} min={0}   max={100} onChange={v => updateSharp({ detail: v })} />
      </Section>

      {/* 노이즈 제거 */}
      <Section title="노이즈 제거" changed={isNRChanged} defaultOpen={false}>
        <Slider label="밝기 노이즈" value={noiseReduction.luminance} min={0} max={100} onChange={v => updateNR({ luminance: v })} />
        <Slider label="색상 노이즈" value={noiseReduction.color}     min={0} max={100} onChange={v => updateNR({ color: v })} />
      </Section>

      {/* 하단 버튼 */}
      <div style={{ padding: 14, display: 'flex', gap: 8 }}>
        <button
          onClick={() => dispatch({ type: 'EDIT_RESET' })}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: `1px solid ${COLORS.darkBorder}`, background: COLORS.darkElevated,
            color: COLORS.darkText, cursor: 'pointer',
          }}
        >↺ 전체 초기화</button>
      </div>
    </div>
  );
}
