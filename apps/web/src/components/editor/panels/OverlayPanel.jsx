import React, { useState, useRef } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { COLORS } from '../../../constants/colors';

const COLOR_SWATCHES = ['#ffffff', '#000000', '#e53e3e', '#f59e0b', '#ecc94b', '#48bb78', '#4299e1', '#9f7aea'];
const FONT_FAMILIES  = ['sans-serif', 'serif', 'monospace'];
const FONT_LABELS    = { 'sans-serif': 'Sans', serif: 'Serif', monospace: 'Mono' };

let _id = 1;
function nextId() { return `ov_${_id++}`; }

function PositionGrid({ onSelect }) {
  const positions = [
    ['top-left', 'top-center', 'top-right'],
    ['mid-left', 'mid-center', 'mid-right'],
    ['bot-left', 'bot-center', 'bot-right'],
  ];
  const coordMap = {
    'top-left': [0.1, 0.1], 'top-center': [0.5, 0.1], 'top-right': [0.9, 0.1],
    'mid-left': [0.1, 0.5], 'mid-center': [0.5, 0.5], 'mid-right': [0.9, 0.5],
    'bot-left': [0.1, 0.9], 'bot-center': [0.5, 0.9], 'bot-right': [0.9, 0.9],
  };
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 3, marginTop: 8 }}>
      {positions.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
          {row.map(pos => (
            <button
              key={pos}
              onClick={() => onSelect(coordMap[pos])}
              style={{
                height: 22, borderRadius: 4,
                background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function OverlayPanel() {
  const { currentEditState, dispatch } = useEditor();
  const { overlays } = currentEditState;
  const [selectedId, setSelectedId] = useState(null);
  const fileRef = useRef(null);
  const dragIdx = useRef(null);

  const updateOverlays = list => dispatch({ type: 'EDIT_UPDATE', patch: { overlays: list } });

  const addText = () => {
    const ov = {
      id: nextId(), type: 'text', text: '텍스트를 입력하세요',
      x: 0.5, y: 0.5, fontSize: 48, fontFamily: 'sans-serif',
      color: '#ffffff', opacity: 100, shadow: false, hidden: false,
    };
    const list = [...overlays, ov];
    updateOverlays(list);
    setSelectedId(ov.id);
  };

  const addWatermark = file => {
    if (!file) return;
    const ov = {
      id: nextId(), type: 'watermark', src: URL.createObjectURL(file),
      x: 0.9, y: 0.9, size: 30, opacity: 70, hidden: false,
    };
    updateOverlays([...overlays, ov]);
    setSelectedId(ov.id);
  };

  const updateOv = (id, patch) => {
    updateOverlays(overlays.map(o => o.id === id ? { ...o, ...patch } : o));
  };

  const removeOv = id => {
    updateOverlays(overlays.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDragStart = (e, idx) => { dragIdx.current = idx; };
  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === toIdx) return;
    const next = [...overlays];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(toIdx, 0, moved);
    updateOverlays(next);
    dragIdx.current = null;
  };

  const selected = overlays.find(o => o.id === selectedId);

  return (
    <div style={{ padding: 14 }}>
      {/* Add buttons */}
      <button
        onClick={addText}
        style={{
          width: '100%', marginBottom: 8, padding: '9px 0', borderRadius: 8,
          background: COLORS.primary, border: 'none', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >✏️ 텍스트 추가</button>
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%', marginBottom: 16, padding: '9px 0', borderRadius: 8,
          background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
          color: COLORS.darkText, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >🖼️ 워터마크 추가</button>
      <input
        ref={fileRef} type="file" accept="image/*" hidden
        onChange={e => { addWatermark(e.target.files[0]); e.target.value = ''; }}
      />

      {/* Overlay list */}
      {overlays.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {overlays.map((ov, idx) => (
            <div
              key={ov.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => setSelectedId(ov.id === selectedId ? null : ov.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                background: selectedId === ov.id ? COLORS.darkElevated : 'transparent',
                border: `1px solid ${selectedId === ov.id ? COLORS.darkBorder : 'transparent'}`,
              }}
            >
              <span style={{ color: COLORS.darkTextHint, cursor: 'grab', fontSize: 14 }}>⠿</span>
              <span>{ov.type === 'text' ? '✏️' : '🖼️'}</span>
              <span style={{ flex: 1, fontSize: 11, color: COLORS.darkTextSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ov.type === 'text' ? (ov.text?.slice(0, 16) || '텍스트') : '워터마크'}
              </span>
              <button onClick={e => { e.stopPropagation(); updateOv(ov.id, { hidden: !ov.hidden }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: ov.hidden ? 0.3 : 1 }}
              >👁</button>
              <button onClick={e => { e.stopPropagation(); removeOv(ov.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, fontSize: 14 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Selected overlay options */}
      {selected?.type === 'text' && (
        <div style={{ borderTop: `1px solid ${COLORS.darkBorder}`, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.darkTextSub, marginBottom: 8 }}>텍스트 옵션</div>

          <textarea
            value={selected.text}
            onChange={e => updateOv(selected.id, { text: e.target.value })}
            rows={2}
            style={{
              width: '100%', marginBottom: 10, padding: '6px 8px', borderRadius: 6,
              background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.darkText, fontSize: 12, resize: 'vertical', boxSizing: 'border-box',
            }}
          />

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>크기</span>
              <span style={{ fontSize: 11, color: COLORS.primary }}>{selected.fontSize}px</span>
            </div>
            <input type="range" min="12" max="200" value={selected.fontSize}
              onChange={e => updateOv(selected.id, { fontSize: Number(e.target.value) })}
              style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {FONT_FAMILIES.map(f => (
              <button key={f} onClick={() => updateOv(selected.id, { fontFamily: f })} style={{
                flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: selected.fontFamily === f ? COLORS.primary : COLORS.darkElevated,
                color: selected.fontFamily === f ? '#fff' : COLORS.darkText,
                fontFamily: f,
              }}>{FONT_LABELS[f]}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {COLOR_SWATCHES.map(c => (
              <button key={c} onClick={() => updateOv(selected.id, { color: c })} style={{
                width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                border: `2px solid ${selected.color === c ? '#fff' : 'transparent'}`,
              }} />
            ))}
            <input type="color" value={selected.color} onChange={e => updateOv(selected.id, { color: e.target.value })}
              style={{ width: 22, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>불투명도</span>
            <span style={{ fontSize: 11, color: COLORS.primary }}>{selected.opacity}%</span>
          </div>
          <input type="range" min="0" max="100" value={selected.opacity}
            onChange={e => updateOv(selected.id, { opacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer', marginBottom: 10 }} />

          <button onClick={() => updateOv(selected.id, { shadow: !selected.shadow })} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: selected.shadow ? COLORS.primary : COLORS.darkElevated,
            color: selected.shadow ? '#fff' : COLORS.darkText,
          }}>그림자 {selected.shadow ? 'ON' : 'OFF'}</button>
        </div>
      )}

      {selected?.type === 'watermark' && (
        <div style={{ borderTop: `1px solid ${COLORS.darkBorder}`, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.darkTextSub, marginBottom: 8 }}>워터마크 옵션</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>크기</span>
            <span style={{ fontSize: 11, color: COLORS.primary }}>{selected.size}%</span>
          </div>
          <input type="range" min="10" max="100" value={selected.size}
            onChange={e => updateOv(selected.id, { size: Number(e.target.value) })}
            style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer', marginBottom: 10 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: COLORS.darkTextSub }}>불투명도</span>
            <span style={{ fontSize: 11, color: COLORS.primary }}>{selected.opacity}%</span>
          </div>
          <input type="range" min="0" max="100" value={selected.opacity}
            onChange={e => updateOv(selected.id, { opacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer', marginBottom: 10 }} />
          <div style={{ fontSize: 11, color: COLORS.darkTextSub, marginBottom: 4 }}>위치</div>
          <PositionGrid onSelect={([x, y]) => updateOv(selected.id, { x, y })} />
        </div>
      )}
    </div>
  );
}
