import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../../constants/colors';
import { moodboardApi } from '../../services/moodboardApi';
import Button from '../common/Button';

/**
 * 보드에 담기 — 사진 한 장을 내 무드보드들에 넣고 빼는 선택창 (WORK_QUEUE 5).
 * 체크 즉시 서버 반영(낙관적, 실패 시 롤백). 아래 입력으로 새 보드를 만들면 그 보드에 바로 담는다.
 */
export default function BoardPickerModal({ photoId, onClose }) {
  const [boards, setBoards] = useState(null);   // null = 로딩
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    let alive = true;
    moodboardApi.list(photoId)
      .then(list => { if (alive) setBoards(list); })
      .catch(() => { if (alive) { setBoards([]); setError('보드를 불러오지 못했어요.'); } });
    return () => { alive = false; };
  }, [photoId]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    // 캡처 단계에서 먼저 받아 전파를 끊는다 — 사진 모달 위에 떴을 때 Esc가 뒤 모달까지 닫지 않도록
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey, true); };
  }, [onClose]);

  const toggle = async (board) => {
    if (busyId) return;
    const next = !board.containsPhoto;
    setBusyId(board.id);
    setError('');
    setBoards(bs => bs.map(b => b.id === board.id ? { ...b, containsPhoto: next, itemCount: b.itemCount + (next ? 1 : -1) } : b));
    try {
      if (next) await moodboardApi.addPhoto(board.id, photoId);
      else await moodboardApi.removePhoto(board.id, photoId);
    } catch (err) {
      setBoards(bs => bs.map(b => b.id === board.id ? board : b));
      setError(err?.response?.data?.message || '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const createAndAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError('');
    try {
      const created = await moodboardApi.create(name);
      await moodboardApi.addPhoto(created.id, photoId);
      setBoards(bs => [{ id: created.id, name: created.name, itemCount: 1, containsPhoto: true, previewPhotos: [] }, ...(bs || [])]);
      setNewName('');
    } catch (err) {
      setError(err?.response?.data?.message || '보드를 만들지 못했어요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <style>{`
        .board-row { transition: background 0.12s ease; }
        .board-row:hover { background: ${COLORS.surfaceDim}; }
        .board-row:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: -2px; }
      `}</style>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="board-picker-title" tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          background: COLORS.surface, borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', outline: 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
          <h2 id="board-picker-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.text }}>보드에 담기</h2>
          <button type="button" onClick={onClose} aria-label="닫기"
            style={{ border: 'none', background: 'transparent', fontSize: 18, color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 8px' }}>
          {boards === null ? (
            <div style={{ padding: '24px 12px', color: COLORS.textMuted, fontSize: 14 }}>불러오는 중…</div>
          ) : boards.length === 0 ? (
            <div style={{ padding: '16px 12px 8px', color: COLORS.textMuted, fontSize: 14, lineHeight: 1.6 }}>
              아직 보드가 없어요. 아래에서 첫 보드를 만들어 보세요.
            </div>
          ) : boards.map(b => (
            <button key={b.id} type="button" className="board-row" role="checkbox" aria-checked={Boolean(b.containsPhoto)}
              onClick={() => toggle(b)} disabled={busyId === b.id}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: 'none',
                borderRadius: 10, background: 'transparent', cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: COLORS.border }}>
                {b.previewPhotos?.[0] && <img src={b.previewPhotos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{b.itemCount}장</span>
              </span>
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${b.containsPhoto ? COLORS.primary : COLORS.border}`,
                background: b.containsPhoto ? COLORS.primary : COLORS.surface, color: '#fff', fontSize: 13, fontWeight: 800,
              }}>{b.containsPhoto ? '✓' : ''}</span>
            </button>
          ))}
        </div>

        {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, padding: '8px 20px 0' }}>{error}</div>}

        <form onSubmit={createAndAdd} style={{ display: 'flex', gap: 8, padding: '14px 20px 18px', borderTop: `1px solid ${COLORS.border}`, marginTop: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={50}
            placeholder="새 보드 이름 (예: 봄 웨딩 레퍼런스)" aria-label="새 보드 이름"
            style={{ flex: 1, minWidth: 0, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '0 12px', fontSize: 14, color: COLORS.text, outline: 'none' }} />
          <Button type="submit" size="sm" loading={creating} disabled={!newName.trim()}>
            {creating ? '만드는 중' : '만들고 담기'}
          </Button>
        </form>
      </div>
    </div>
  );
}
