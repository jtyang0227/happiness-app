import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import { moodboardApi } from '../../services/moodboardApi';

/** 프로필 저장함 탭 상단 — 내 무드보드 카드 목록 + 새 보드 만들기 (WORK_QUEUE 5) */
export default function BoardList() {
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    moodboardApi.list()
      .then(list => { if (alive) setBoards(list); })
      .catch(() => { if (alive) { setBoards([]); setError('보드를 불러오지 못했어요.'); } });
    return () => { alive = false; };
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const b = await moodboardApi.create(name.trim());
      setBoards(bs => [{ id: b.id, name: b.name, itemCount: 0, previewPhotos: [] }, ...(bs || [])]);
      setName('');
    } catch (err) {
      setError(err?.response?.data?.message || '보드를 만들지 못했어요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section aria-labelledby="my-boards-heading" style={{ padding: '8px 0 20px' }}>
      <style>{`
        .board-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .board-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .board-card:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .board-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 599px) { .board-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (prefers-reduced-motion: reduce) { .board-card, .board-card:hover { transition: none; transform: none; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <h3 id="my-boards-heading" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.text }}>
          내 보드 {boards && <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{boards.length}</span>}
        </h3>
        <form onSubmit={create} style={{ display: 'flex', gap: 6 }}>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder="새 보드 이름" aria-label="새 보드 이름"
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, width: 150, outline: 'none', color: COLORS.text }} />
          <button type="submit" disabled={!name.trim() || creating}
            style={{ border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default',
              background: name.trim() ? COLORS.primary : COLORS.border, color: name.trim() ? '#fff' : COLORS.textMuted }}>
            {creating ? '만드는 중…' : '+ 만들기'}
          </button>
        </form>
      </div>
      {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {boards === null ? (
        <div className="board-grid">
          {[0, 1, 2].map(i => <div key={i} style={{ aspectRatio: '4 / 3', borderRadius: 12, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : boards.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          사진 상세에서 "📌 보드에 담기"로 레퍼런스를 주제별로 모아 보세요.
        </p>
      ) : (
        <div className="board-grid">
          {boards.map(b => (
            <Link key={b.id} to={`/boards/${b.id}`} className="board-card"
              style={{ display: 'block', textDecoration: 'none', color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden', background: COLORS.surface }}>
              <div style={{ aspectRatio: '4 / 3', display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, background: COLORS.border }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ gridRow: i === 0 ? 'span 2' : undefined, background: COLORS.surfaceDim, overflow: 'hidden' }}>
                    {b.previewPhotos?.[i] && <img src={b.previewPhotos[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{b.itemCount}장</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
