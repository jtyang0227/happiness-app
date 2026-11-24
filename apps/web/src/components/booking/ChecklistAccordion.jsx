import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import { bookingApi } from '../../services/bookingApi';

function parseChecklist(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChecklistAccordion({ booking, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => parseChecklist(booking.checklistJson));
  const [newText, setNewText] = useState('');
  const [deadline, setDeadline] = useState(booking.deliveryDeadline || '');
  const [saving, setSaving] = useState(false);

  const persist = async (nextItems, nextDeadline) => {
    setSaving(true);
    try {
      const updated = await bookingApi.updateChecklist(booking.id, {
        checklistJson: JSON.stringify(nextItems),
        deliveryDeadline: nextDeadline || null,
      });
      onUpdate && onUpdate(updated);
    } catch {
      // 실패 시에도 화면 상태는 유지 — 다음 조작에서 다시 시도
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const text = newText.trim();
    if (!text) return;
    const next = [...items, { id: genId(), text, checked: false }];
    setItems(next);
    setNewText('');
    persist(next, deadline);
  };

  const toggleItem = (id) => {
    const next = items.map(it => it.id === id ? { ...it, checked: !it.checked } : it);
    setItems(next);
    persist(next, deadline);
  };

  const removeItem = (id) => {
    const next = items.filter(it => it.id !== id);
    setItems(next);
    persist(next, deadline);
  };

  const handleDeadlineChange = (e) => {
    const next = e.target.value;
    setDeadline(next);
    persist(items, next);
  };

  const doneCount = items.filter(it => it.checked).length;

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
          ✅ 촬영 준비 체크리스트 {items.length > 0 && `(${doneCount}/${items.length})`}
        </span>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {items.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!it.checked}
                    onChange={() => toggleItem(it.id)}
                    style={{ width: 16, height: 16, accentColor: COLORS.primary, cursor: 'pointer' }}
                  />
                  <span style={{
                    flex: 1, fontSize: 13,
                    color: it.checked ? COLORS.textMuted : COLORS.text,
                    textDecoration: it.checked ? 'line-through' : 'none',
                  }}>
                    {it.text}
                  </span>
                  <button
                    onClick={() => removeItem(it.id)}
                    style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 14, cursor: 'pointer', padding: 2 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              placeholder="준비물 추가 (예: 카메라 바디)"
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.border}`,
                fontSize: 13, color: COLORS.text, outline: 'none',
              }}
            />
            <button
              onClick={addItem}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              + 추가
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>납품 기한</label>
            <input
              type="date"
              value={deadline || ''}
              onChange={handleDeadlineChange}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.border}`,
                fontSize: 12, color: COLORS.text, outline: 'none',
              }}
            />
            {saving && <span style={{ fontSize: 11, color: COLORS.textMuted }}>저장 중...</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function isDeliveryDeadlineNear(deadline) {
  if (!deadline) return false;
  const target = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
}
