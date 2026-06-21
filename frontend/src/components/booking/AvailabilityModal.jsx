import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import { bookingApi } from '../../services/bookingApi';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AvailabilityModal({ onClose }) {
  const [enabledDays, setEnabledDays] = useState(new Set([1, 2, 3, 4, 5])); // Mon-Fri default
  const [slots, setSlots] = useState(['09:00', '11:00', '14:00', '16:00']);
  const [newSlot, setNewSlot] = useState('');
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingApi.getAvailabilitySettings()
      .then(data => {
        if (!data) return;
        if (data.enabledDays) setEnabledDays(new Set(data.enabledDays));
        if (data.timeSlots) setSlots(data.timeSlots);
        if (data.blockedDates) setBlockedDates(data.blockedDates);
      })
      .catch(() => {}); // Use defaults on error
  }, []);

  const toggleDay = (idx) => {
    setEnabledDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addSlot = () => {
    const v = newSlot.trim();
    if (!v || slots.includes(v)) return;
    setSlots(prev => [...prev, v].sort());
    setNewSlot('');
  };

  const removeSlot = (s) => setSlots(prev => prev.filter(x => x !== s));

  const addBlockedDate = async () => {
    const d = newBlockedDate.trim();
    if (!d || blockedDates.find(b => b.date === d)) return;
    try {
      const result = await bookingApi.addBlockedDate({ date: d });
      setBlockedDates(prev => [...prev, result || { id: Date.now(), date: d }]);
      setNewBlockedDate('');
    } catch {
      setBlockedDates(prev => [...prev, { id: Date.now(), date: d }]);
      setNewBlockedDate('');
    }
  };

  const removeBlockedDate = async (id) => {
    try {
      await bookingApi.deleteBlockedDate(id);
    } catch {}
    setBlockedDates(prev => prev.filter(b => b.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await bookingApi.saveAvailabilitySettings({
        enabledDays: Array.from(enabledDays),
        timeSlots: slots,
      });
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 16px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, margin: 0 }}>가용 시간 설정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: COLORS.textMuted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          {/* Weekday toggles */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>예약 가능 요일</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEKDAYS.map((w, idx) => {
                const active = enabledDays.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
                      background: active ? COLORS.primary : COLORS.surface,
                      color: active ? '#fff' : COLORS.textSecondary,
                      fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
                    }}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>시간 슬롯</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {slots.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 20, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 12, color: COLORS.text }}>{s}</span>
                  <button onClick={() => removeSlot(s)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="time"
                value={newSlot}
                onChange={e => setNewSlot(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, background: COLORS.surface, outline: 'none' }}
              />
              <button onClick={addSlot} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + 추가
              </button>
            </div>
          </div>

          {/* Blocked dates */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>차단 날짜</div>
            {blockedDates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {blockedDates.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 20, background: '#fff0f0', border: `1px solid #fecaca` }}>
                    <span style={{ fontSize: 12, color: COLORS.danger }}>{b.date}</span>
                    <button onClick={() => removeBlockedDate(b.id)} style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={newBlockedDate}
                onChange={e => setNewBlockedDate(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, background: COLORS.surface, outline: 'none' }}
              />
              <button onClick={addBlockedDate} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: COLORS.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                추가
              </button>
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: COLORS.danger, marginBottom: 12 }}>{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: saving ? COLORS.border : COLORS.primary, color: saving ? COLORS.textMuted : '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
