import React, { useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { COLORS } from '../../../constants/colors';

const RATIOS = [
  { label: '자유', value: null },
  { label: '1:1',  value: 1 },
  { label: '4:5',  value: 4 / 5 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:2',  value: 3 / 2 },
];

function Section({ title, children, defaultOpen = true }) {
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
        {title}
        <span style={{ fontSize: 10, color: COLORS.darkTextHint }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

export default function TransformPanel() {
  const { currentEditState, dispatch } = useEditor();
  const { crop, rotate, flip } = currentEditState;

  const update = patch => dispatch({ type: 'EDIT_UPDATE', patch });

  const setRatio = ratio => {
    dispatch({ type: 'TOOL_SET', tool: 'crop' });
    update({ crop: { ...crop, ratio } });
  };

  const handleRotate = val => update({ rotate: Math.max(-180, Math.min(180, Number(val))) });
  const stepRotate   = deg => update({ rotate: Math.max(-180, Math.min(180, (rotate + deg))) });

  return (
    <div>
      {/* Crop */}
      <Section title="✂ 크롭">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {RATIOS.map(r => {
            const active = crop.ratio === r.value;
            return (
              <button
                key={r.label}
                onClick={() => setRatio(r.value)}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: active ? COLORS.primary : COLORS.darkElevated,
                  color: active ? '#fff' : COLORS.darkText,
                  transition: 'background 0.15s',
                }}
              >{r.label}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => dispatch({ type: 'TOOL_SET', tool: 'select' })}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: 'none', background: COLORS.primary, color: '#fff', cursor: 'pointer',
            }}
          >✓ 적용</button>
          <button
            onClick={() => {
              dispatch({ type: 'TOOL_SET', tool: 'select' });
              update({ crop: { x: 0, y: 0, w: 1, h: 1, ratio: null } });
            }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: 'none', background: COLORS.danger, color: '#fff', cursor: 'pointer',
            }}
          >✗ 취소</button>
        </div>
      </Section>

      {/* Rotate */}
      <Section title="↺ 회전">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>각도</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{rotate}°</span>
        </div>
        <input
          type="range" min="-180" max="180" step="1"
          value={rotate}
          onChange={e => handleRotate(e.target.value)}
          onDoubleClick={() => handleRotate(0)}
          style={{ width: '100%', accentColor: COLORS.primary, marginBottom: 10, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[['↺ -90°', -90], ['↻ +90°', 90]].map(([label, deg]) => (
            <button key={deg} onClick={() => stepRotate(deg)} style={{
              flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: `1px solid ${COLORS.darkBorder}`, background: COLORS.darkElevated,
              color: COLORS.darkText, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.darkTextSub, flexShrink: 0 }}>직접 입력</span>
          <input
            type="number" min="-180" max="180"
            value={rotate}
            onChange={e => handleRotate(e.target.value)}
            style={{
              flex: 1, padding: '5px 8px', borderRadius: 6, fontSize: 12,
              background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.darkText, textAlign: 'right',
            }}
          />
        </div>
      </Section>

      {/* Flip */}
      <Section title="↔ 뒤집기">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['↔ 수평', 'h'], ['↕ 수직', 'v']].map(([label, dir]) => {
            const active = flip[dir];
            return (
              <button
                key={dir}
                onClick={() => update({ flip: { ...flip, [dir]: !active } })}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: active ? COLORS.primary : COLORS.darkElevated,
                  color: active ? '#fff' : COLORS.darkText,
                  transition: 'background 0.15s',
                }}
              >{label}</button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
