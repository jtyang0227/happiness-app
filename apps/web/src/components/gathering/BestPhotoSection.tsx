import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import gatheringApi from '../../services/gatheringApi';

const MEDAL = ['🥇', '🥈', '🥉'];

/** SNAPDAY 베스트 포토 — 끝난 출사 참여자가 1인 3표, 득표순·최신순, 회원 필터 */
export default function BestPhotoSection({ gatheringId }: { gatheringId: any }) {
  const [data, setData] = useState<any>(null);
  const [sort, setSort] = useState<'best' | 'latest'>('best');
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    gatheringApi.getBest(gatheringId).then((d) => alive && setData(d)).catch(() => alive && setData(null));
    return () => { alive = false; };
  }, [gatheringId]);

  const members = useMemo(() => [...new Map((data?.photos ?? []).map((p: any) => [p.memberId, p.memberName])).entries()], [data]);
  if (!data || data.photos.length === 0) return null;

  const rank = new Map(data.photos.filter((p: any) => p.votes > 0).slice(0, 3).map((p: any, i: number) => [p.photoId, i]));
  const mine = new Set(data.myVotes);
  const shown = data.photos
    .filter((p: any) => !member || String(p.memberId) === member)
    .slice()
    .sort((a: any, b: any) => (sort === 'best' ? b.votes - a.votes || a.photoId - b.photoId : (b.createdAt || '').localeCompare(a.createdAt || '')));

  const toggle = async (p: any) => {
    if (!data.canVote || busy) return;
    setBusy(p.photoId); setError('');
    try {
      setData(mine.has(p.photoId) ? await gatheringApi.unvoteBest(gatheringId, p.photoId) : await gatheringApi.voteBest(gatheringId, p.photoId));
    } catch (e: any) {
      setError(e?.response?.data?.message || '투표하지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="best-title" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 id="best-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
          🏆 베스트 포토 {data.canVote && <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>· 내 표 {data.myVotes.length}/{data.maxVotes}</span>}
        </h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['best', 'latest'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}
              style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: `1px solid ${sort === k ? COLORS.primary : COLORS.border}`, background: sort === k ? COLORS.primaryLight : COLORS.surface, color: sort === k ? COLORS.primary : COLORS.textSecondary }}>
              {k === 'best' ? '인기순' : '최신순'}
            </button>
          ))}
          <select aria-label="회원별 보기" value={member} onChange={(e) => setMember(e.target.value)} style={{ height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, padding: '0 8px' }}>
            <option value="">전체 회원</option>
            {members.map(([id, name]: any) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: COLORS.textMuted }}>
        {!data.open ? '출사가 끝나면 참여자가 마음에 드는 사진 3장에 투표할 수 있어요.' : data.canVote ? '마음에 드는 사진을 3장까지 골라 주세요. 다시 누르면 빠져요.' : '출사 참여자가 투표해요.'}
      </p>
      {error && <div role="alert" style={{ marginBottom: 10, fontSize: 13, color: COLORS.danger }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {shown.map((p: any) => (
          <figure key={p.photoId} style={{ margin: 0, position: 'relative', borderRadius: 12, overflow: 'hidden', background: COLORS.surfaceDim }}>
            <img src={p.imageUrl} alt={p.caption || `${p.memberName}의 사진`} loading="lazy" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
            {rank.has(p.photoId) && <span aria-label={`${(rank.get(p.photoId) as number) + 1}위`} style={{ position: 'absolute', top: 6, left: 6, fontSize: 20 }}>{MEDAL[rank.get(p.photoId) as number]}</span>}
            <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '6px 8px', background: COLORS.surface }}>
              <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.memberName}</span>
              <button type="button" disabled={!data.canVote || busy !== null} onClick={() => toggle(p)} aria-pressed={mine.has(p.photoId)}
                aria-label={`${p.memberName}의 사진에 ${mine.has(p.photoId) ? '투표 취소' : '투표'}, 현재 ${p.votes}표`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                  cursor: data.canVote ? 'pointer' : 'default', background: mine.has(p.photoId) ? COLORS.primary : COLORS.surfaceDim, color: mine.has(p.photoId) ? '#fff' : COLORS.textSecondary }}>
                {busy === p.photoId ? '…' : mine.has(p.photoId) ? '♥' : '♡'} {p.votes}
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      <Link to="/gatherings/best" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 600, color: COLORS.primary, textDecoration: 'none' }}>
        다른 출사까지 모은 베스트 순위 보기 →
      </Link>
    </section>
  );
}
