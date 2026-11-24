import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { moodboardApi } from '../services/moodboardApi';
import DotEmptyState from '../components/common/DotEmptyState';

/**
 * 공유된 무드보드 (/b/:token, 공개·Standalone) — PLANNING_inside-menus-upgrade.md P0-C.
 * 보드 주인이 켠 보기 전용 링크. 의뢰인·협업자가 로그인 없이 "이런 느낌"을 본다. 검색 엔진에는 노출하지 않는다.
 */
export default function SharedBoardPage() {
  const { token } = useParams();
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('loading');   // loading | ready | notfound | error

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    moodboardApi.getShared(token)
      .then(b => {
        if (!alive) return;
        setBoard(b);
        setStatus('ready');
        document.title = `${b.name} — Happiness 보드`;
      })
      .catch(err => { if (alive) setStatus(err?.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { alive = false; };
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <header style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/explore" style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, textDecoration: 'none' }}>Happiness</Link>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>보기 전용 보드</span>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 64px' }}>
        {status === 'loading' && (
          <div aria-hidden="true">
            <div style={{ width: 240, height: 30, borderRadius: 8, background: COLORS.border, marginBottom: 24, animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
            </div>
          </div>
        )}

        {(status === 'notfound' || status === 'error') && (
          <DotEmptyState icon="📌" theme="light"
            title={status === 'notfound' ? '볼 수 없는 보드예요' : '보드를 불러오지 못했어요'}
            description={status === 'notfound' ? '공유가 끝났거나 주소가 잘못됐어요. 보드를 보낸 분께 새 링크를 요청해 주세요.' : '잠시 후 다시 시도해 주세요.'} />
        )}

        {status === 'ready' && (
          <>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLORS.text, wordBreak: 'keep-all', textWrap: 'balance' }}>
              📌 {board.name}
            </h1>
            <p style={{ margin: '6px 0 22px', fontSize: 14, color: COLORS.textMuted }}>
              {board.ownerName ? `${board.ownerName}님의 보드 · ` : ''}{board.photos.length}장
            </p>
            {board.photos.length === 0 ? (
              <DotEmptyState icon="📌" theme="light" title="아직 담긴 사진이 없어요" description="보드 주인이 사진을 담으면 여기에 보여요." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {board.photos.map(p => (
                  <figure key={p.id} style={{ margin: 0 }}>
                    <div style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: COLORS.border }}>
                      <img src={p.thumbnailUrl || p.imageUrl} alt={p.title || '보드 사진'} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    {p.memberName && (
                      <figcaption style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📷 {p.memberProfileName
                          ? <Link to={`/portfolio/${p.memberProfileName}`} style={{ color: COLORS.textSecondary }}>{p.memberName}</Link>
                          : p.memberName}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <Link to="/explore" style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, textDecoration: 'none' }}>Happiness에서 둘러보기 →</Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
