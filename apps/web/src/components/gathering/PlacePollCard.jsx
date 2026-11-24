import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import gatheringApi from '../../services/gatheringApi';

/**
 * 모임 장소 투표 (ANALYSIS_chulsa P1). 후보가 없으면 아무것도 그리지 않는다.
 * 투표는 참여 신청자만 — 서버가 403으로 막으면 그 사유를 그대로 보여 준다(내 참여 상태 조회 API가 없어서).
 */
export default function PlacePollCard({ gatheringId, canVote }) {
  const [poll, setPoll] = useState(null);
  const [voting, setVoting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    gatheringApi.getPlacePoll(gatheringId).then(p => { if (alive) setPoll(p); }).catch(() => {});
    return () => { alive = false; };
  }, [gatheringId]);

  if (!poll || !poll.options?.length) return null;

  const vote = async (optionId) => {
    if (voting || optionId === poll.myOptionId) return;
    setVoting(optionId); setError('');
    try {
      setPoll(await gatheringApi.votePlace(gatheringId, optionId));
    } catch (err) {
      setError(err?.response?.data?.message || '투표하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setVoting(null);
    }
  };

  const total = poll.totalVotes || 0;
  const interactive = poll.open && canVote;

  return (
    <section aria-labelledby="place-poll-title" style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      <style>{`.poll-opt{transition:border-color .15s ease, background .15s ease}.poll-opt:hover:not(:disabled){border-color:${COLORS.primary}}.poll-opt:focus-visible{outline:2px solid ${COLORS.primary};outline-offset:2px}`}</style>
      <h2 id="place-poll-title" style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: COLORS.text }}>🗳 장소 투표</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: COLORS.textMuted }}>
        {poll.open
          ? `참여 신청한 사람이 골라요 · ${total}표 · 모집이 마감되면 가장 많이 받은 곳으로 정해져요`
          : poll.winnerOptionId ? `투표가 끝났어요 · ${total}표` : '투표가 끝났어요 · 표가 없어 장소는 그대로예요'}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {poll.options.map(o => {
          const pct = total ? Math.round((o.voteCount / total) * 100) : 0;
          const mine = poll.myOptionId === o.id;
          const won = poll.winnerOptionId === o.id;
          return (
            <li key={o.id}>
              <button type="button" className="poll-opt" disabled={!interactive || voting !== null}
                onClick={() => vote(o.id)} aria-pressed={mine}
                aria-label={`${o.label}, ${o.voteCount}표${mine ? ', 내가 고른 곳' : ''}${won ? ', 정해진 장소' : ''}`}
                style={{
                  position: 'relative', width: '100%', minHeight: 48, padding: '12px 14px', borderRadius: 12, overflow: 'hidden',
                  border: `1.5px solid ${mine || won ? COLORS.primary : COLORS.border}`, background: COLORS.surface,
                  cursor: interactive ? 'pointer' : 'default', textAlign: 'left',
                }}>
                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: COLORS.primaryLight }} />
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: mine || won ? 700 : 500, color: COLORS.text }}>
                    {won ? '✓ ' : ''}{o.spotId ? '📍 ' : ''}{o.label}{mine ? ' · 내 선택' : ''}
                  </span>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>
                    {voting === o.id ? '…' : `${o.voteCount}표`}
                  </span>
                </span>
              </button>
              {o.spotId && (
                <Link to={`/spots/${o.spotId}`} style={{ display: 'inline-block', marginTop: 4, marginLeft: 4, fontSize: 12, color: COLORS.primary }}>스팟 보기 →</Link>
              )}
            </li>
          );
        })}
      </ul>
      {poll.open && !canVote && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: COLORS.textMuted }}>로그인하고 참여 신청하면 투표할 수 있어요.</p>
      )}
      {error && <div role="alert" style={{ marginTop: 10, fontSize: 13, color: COLORS.danger }}>{error}</div>}
    </section>
  );
}
