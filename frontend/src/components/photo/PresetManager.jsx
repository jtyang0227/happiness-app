import React, { useState, useRef, useEffect } from 'react';
import { usePresets, MAX_PRESETS } from '../../hooks/usePresets';
import { COLORS } from '../../constants/colors';

const S = {
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 8px', borderRadius: 8, marginBottom: 4,
    background: '#0d0d22', border: '1px solid #1a1a38',
  },
  indexBadge: {
    fontSize: 10, fontWeight: 700, color: '#404060',
    minWidth: 14, textAlign: 'center', flexShrink: 0,
  },
  nameText: {
    flex: 1, fontSize: 12, color: '#c0c0e0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nameInput: {
    flex: 1, padding: '2px 6px', borderRadius: 4,
    border: `1px solid ${COLORS.primary}`,
    background: '#12122a', color: '#eeeeff',
    fontSize: 12, outline: 'none', minWidth: 0,
  },
  applyBtn: {
    padding: '3px 8px', borderRadius: 5,
    border: `1px solid ${COLORS.primary}`,
    background: 'transparent', color: COLORS.primary,
    fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    transition: 'all 0.15s',
  },
  deleteBtn: {
    padding: '3px 7px', borderRadius: 5,
    border: '1px solid #222248',
    background: 'transparent', color: '#555580',
    fontSize: 12, cursor: 'pointer', flexShrink: 0,
    lineHeight: 1,
  },
  saveInput: {
    flex: 1, padding: '5px 8px', borderRadius: 6,
    border: `1px solid ${COLORS.primary}`,
    background: '#0f0f28', color: '#eeeeff',
    fontSize: 12, outline: 'none', minWidth: 0,
  },
  confirmBtn: {
    padding: '4px 10px', borderRadius: 6,
    border: 'none', background: COLORS.primary,
    color: '#fff', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
  },
  cancelBtn: {
    padding: '4px 8px', borderRadius: 6,
    border: '1px solid #2a2a50', background: 'none',
    color: '#6060a0', fontSize: 11, cursor: 'pointer', flexShrink: 0,
  },
};

export default function PresetManager({ adjustments, channelCurves, effects, onApply }) {
  const { presets, addPreset, removePreset, renamePreset } = usePresets();

  const [saving, setSaving]         = useState(false);
  const [newName, setNewName]       = useState('');
  const [editingId, setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState('');
  const [toast, setToast]           = useState('');

  const saveInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => { if (saving)    saveInputRef.current?.focus(); }, [saving]);
  useEffect(() => { if (editingId) editInputRef.current?.select(); }, [editingId]);

  // 간단한 인라인 토스트
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const isFull = presets.length >= MAX_PRESETS;

  const handleStartSave = () => {
    if (isFull) { setToast('프리셋은 최대 5개까지 저장할 수 있습니다.'); return; }
    setNewName(`프리셋 ${presets.length + 1}`);
    setSaving(true);
  };

  const handleConfirmSave = () => {
    if (!newName.trim()) return;
    addPreset(newName, adjustments, channelCurves, effects);
    setSaving(false);
    setNewName('');
    setToast('프리셋이 저장되었습니다.');
  };

  const handleCancelSave = () => { setSaving(false); setNewName(''); };

  const handleStartEdit = (preset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleConfirmEdit = () => {
    if (editingName.trim()) renamePreset(editingId, editingName);
    setEditingId(null);
  };

  const handleApply = (preset) => {
    onApply({
      adjustments:   { ...preset.adjustments },
      channelCurves: {
        rgb: preset.channelCurves.rgb.map(p => ({ ...p })),
        r:   preset.channelCurves.r.map(p => ({ ...p })),
        g:   preset.channelCurves.g.map(p => ({ ...p })),
        b:   preset.channelCurves.b.map(p => ({ ...p })),
      },
      effects: { ...preset.effects },
    });
    setToast(`"${preset.name}" 적용됨`);
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          프리셋 ({presets.length}/{MAX_PRESETS})
        </span>
        <button type="button" onClick={handleStartSave} disabled={saving}
          style={{
            fontSize: 11, fontWeight: 700,
            color: isFull ? '#3a3a6e' : COLORS.primary,
            background: 'none', border: 'none',
            cursor: isFull ? 'default' : 'pointer', padding: '2px 4px',
          }}
        >
          {isFull ? '최대 5개' : '+ 현재 설정 저장'}
        </button>
      </div>

      {/* 저장 인풋 */}
      {saving && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <input
            ref={saveInputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleConfirmSave();
              if (e.key === 'Escape') handleCancelSave();
            }}
            placeholder="프리셋 이름"
            maxLength={20}
            style={S.saveInput}
          />
          <button type="button" onClick={handleConfirmSave} style={S.confirmBtn}>저장</button>
          <button type="button" onClick={handleCancelSave}  style={S.cancelBtn}>취소</button>
        </div>
      )}

      {/* 빈 상태 */}
      {presets.length === 0 && !saving && (
        <div style={{ fontSize: 11, color: '#3a3a5a', textAlign: 'center', padding: '10px 0 6px' }}>
          저장된 프리셋이 없습니다
        </div>
      )}

      {/* 프리셋 목록 */}
      {presets.map((preset, idx) => (
        <div key={preset.id} style={S.row}>
          <span style={S.indexBadge}>{idx + 1}</span>

          {editingId === preset.id ? (
            <input
              ref={editInputRef}
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleConfirmEdit();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={handleConfirmEdit}
              maxLength={20}
              style={S.nameInput}
            />
          ) : (
            <span
              style={{ ...S.nameText, cursor: 'text' }}
              title="더블클릭으로 이름 수정"
              onDoubleClick={() => handleStartEdit(preset)}
            >
              {preset.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleApply(preset)}
            style={S.applyBtn}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.primary; }}
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => removePreset(preset.id)}
            style={S.deleteBtn}
            title="삭제"
            onMouseEnter={e => { e.currentTarget.style.color = '#e53e3e'; e.currentTarget.style.borderColor = '#e53e3e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555580'; e.currentTarget.style.borderColor = '#222248'; }}
          >
            ×
          </button>
        </div>
      ))}

      {/* 인라인 토스트 */}
      {toast && (
        <div style={{
          marginTop: 6, padding: '5px 10px', borderRadius: 6,
          background: '#1a2a1a', border: '1px solid #2a4a2a',
          color: '#80d080', fontSize: 11, textAlign: 'center',
        }}>
          {toast}
        </div>
      )}

      {/* 안내 */}
      {presets.length > 0 && (
        <div style={{ fontSize: 10, color: '#33335a', marginTop: 4, textAlign: 'center' }}>
          더블클릭으로 이름 수정
        </div>
      )}
    </div>
  );
}
