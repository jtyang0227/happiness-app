import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import gatheringApi from '../../services/gatheringApi';

/** SNAPDAY 마이페이지 — 출사 참여 횟수·참여한 출사·내 스토리 */
export default function MyOutingHistory() {
  const [hist, setHist] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([gatheringApi.getMyHistory(), gatheringApi.getMyStories()])
      .then(([h, s]) => { setHist(h); setStories(s); })
      .catch((e) => setError(e?.response?.data?.message || '출사 기록을 불러오지 못했어요.'));
  }, []);

  if (error) return <p role="alert" style={{ padding: 20, color: COLORS.danger, fontSize: 14 }}>{error}</p>;
  if (!hist) return <p style={{ padding: 20, color: COLORS.textMuted, fontSize: 14 }}>불러오는 중…</p>;

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {[['참여한 출사', `${hist.count}회`], ['내 스토리', `${hist.storyCount}개`]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <section>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: COLORS.text }}>참여한 출사</h3>
        {hist.items.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>아직 다녀온 출사가 없어요. <Link to="/gatherings/polls" style={{ color: COLORS.primary }}>이번 달 출사 투표 보기 →</Link></p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hist.items.map((g: any) => (
              <li key={g.id}>
                <Link to={g.status === 'ENDED' ? `/gatherings/${g.id}/album` : `/gatherings/${g.id}`}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 14px', borderRadius: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, textDecoration: 'none' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: COLORS.textMuted }}>{(g.startDateTime || '').slice(0, 10)} · {g.location} · 내 게시물 {g.myPostCount}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: g.status === 'ONGOING' ? COLORS.danger : COLORS.textSecondary, whiteSpace: 'nowrap' }}>{g.status === 'ONGOING' ? '진행 중' : '앨범 →'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {stories.length > 0 && (
        <section>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: COLORS.text }}>내 스토리</h3>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {stories.map((s) => (
              <Link key={s.id} to={`/gatherings/${s.gatheringId}`} aria-label="스토리가 있는 출사로" style={{ flex: '0 0 auto' }}>
                <img src={s.imageUrl} alt="" style={{ width: 80, height: 142, objectFit: 'cover', borderRadius: 10, background: COLORS.surfaceDim, display: 'block' }} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
