import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import Button from '../components/common/Button';
import { gatheringApi } from '../services/gatheringApi';

/* 월간·연말 베스트 포토 순위 — 디자인: DESIGN_PROMPT_snapday-outing.md 7절 */

const MEDAL = ['🥇', '🥈', '🥉'];

export default function BestRankingPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = new Date();
  const year = Number(params.get('year')) || today.getFullYear();
  const yearly = params.get('month') === 'all';
  const month = yearly ? null : Number(params.get('month')) || today.getMonth() + 1;
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError('');
    gatheringApi.getBestRanking({ year, month: month ?? undefined, size: yearly ? 24 : 12 })
      .then((r) => { if (alive) setItems(r.items || []); })
      .catch((e) => { if (alive) { setItems([]); setError(e?.response?.data?.message || '순위를 불러오지 못했어요.'); } });
    return () => { alive = false; };
  }, [year, month, yearly]);

  const go = (next: { year?: number; month?: number | 'all' }) => {
    const y = next.year ?? year;
    const m = next.month ?? (yearly ? 'all' : month);
    setParams({ year: String(y), month: String(m) });
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{`
        .best-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        ${mq.upToTablet} { .best-grid { grid-template-columns:repeat(3,1fr); } }
        ${mq.mobile} { .best-grid { grid-template-columns:repeat(2,1fr); } }
        .best-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .best-card:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        @keyframes best-sk { 0%{opacity:.55} 50%{opacity:1} 100%{opacity:.55} }
      `}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px' }}>
        <button onClick={() => navigate('/gatherings')} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
          ← 모임으로
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 240px' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>🏆 베스트 포토</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.textMuted }}>출사에서 표를 가장 많이 받은 사진</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div role="tablist" aria-label="기간" style={{ display: 'flex', background: COLORS.surfaceDim, borderRadius: 10, padding: 3 }}>
              {[['월간', false], ['연간', true]].map(([label, y]) => (
                <button key={String(label)} role="tab" aria-selected={yearly === y}
                  onClick={() => go({ month: y ? 'all' : (month ?? today.getMonth() + 1) })}
                  style={{ border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    background: yearly === y ? COLORS.surface : 'transparent', color: yearly === y ? COLORS.text : COLORS.textSecondary,
                    boxShadow: yearly === y ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                  {label as string}
                </button>
              ))}
            </div>
            <button aria-label="이전 해" onClick={() => go({ year: year - 1 })} style={yearBtn}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, minWidth: 64, textAlign: 'center' }}>{year}년</span>
            <button aria-label="다음 해" onClick={() => go({ year: year + 1 })} style={yearBtn}>›</button>
          </div>
        </div>

        {!yearly && (
          <div role="tablist" aria-label="월" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button key={m} role="tab" aria-selected={m === month} onClick={() => go({ month: m })}
                style={{ flex: '0 0 auto', border: `1px solid ${m === month ? COLORS.primary : COLORS.border}`, borderRadius: 999,
                  padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: m === month ? COLORS.primary : COLORS.surface, color: m === month ? '#fff' : COLORS.textSecondary }}>
                {m}월
              </button>
            ))}
          </div>
        )}

        {error && <div role="alert" style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14, marginBottom: 16 }}>{error}</div>}

        {items == null ? (
          <div className="best-grid">
            {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 14, background: COLORS.surfaceDim, animation: 'best-sk 1.4s ease-in-out infinite' }} />)}
          </div>
        ) : items.length === 0 && !error ? (
          <div style={{ textAlign: 'center', padding: '56px 16px', background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 36 }}>🏆</div>
            <p style={{ margin: '12px 0 16px', fontSize: 15, color: COLORS.textSecondary, wordBreak: 'keep-all' }}>이 기간에 끝난 출사의 베스트 포토가 아직 없어요</p>
            <Button variant="secondary" onClick={() => navigate('/gatherings/polls')}>출사 투표 보기</Button>
          </div>
        ) : (
          <ol className="best-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((it) => (
              <li key={it.photoId}>
                <button className="best-card" onClick={() => navigate(`/gatherings/${it.gatheringId}/album`)}
                  aria-label={`${it.rank}위, ${it.votes}표, ${it.memberName}, ${it.gatheringTitle}`}
                  style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', padding: 0, background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: 'hidden', transition: 'box-shadow 0.15s ease' }}>
                  <div style={{ position: 'relative', aspectRatio: '1 / 1', background: COLORS.surfaceDim }}>
                    <img src={it.imageUrl} alt={it.caption || `${it.memberName}의 베스트 포토`} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: it.rank <= 3 ? 24 : 12, fontWeight: 700,
                      ...(it.rank <= 3 ? {} : { background: 'rgba(255,255,255,0.92)', color: COLORS.text, borderRadius: 999, padding: '2px 8px' }) }}>
                      {it.rank <= 3 ? MEDAL[it.rank - 1] : `${it.rank}위`}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>🗳 {it.votes}표 · {it.memberName}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.gatheringTitle}</div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const yearBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.textSecondary, fontSize: 18, cursor: 'pointer',
};
