import React, { useEffect, useState } from 'react';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import gatheringApi from '../../services/gatheringApi';

/**
 * SNAPDAY AI 계절 추천. 서버가 Gemini(키 있을 때) 또는 SAMPLE(개발용)로 만든 결과를 보여 준다.
 * 주소·영업시간은 받지 않고, 장소는 카카오맵 검색 링크만 — "방문 전 확인" 문구 고정.
 */
export default function AiRecommendationCard({ gatheringId, canRequest, isCreator }: { gatheringId: any; canRequest: boolean; isCreator: boolean }) {
  const [list, setList] = useState<any[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    gatheringApi.getAiRecommendations(gatheringId).then((l) => { if (alive) setList(l); }).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gatheringId]);

  const request = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await gatheringApi.requestAiRecommendation(gatheringId, question.trim());
      setList((l) => [r, ...(l ?? [])]);
      setIdx(0); setQuestion('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'AI 추천을 받지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const addCandidate = async (name: string) => {
    setError(''); setNotice('');
    try {
      const poll = await gatheringApi.getPlacePoll(gatheringId);
      const current = (poll?.options ?? []).map((o: any) => (o.spotId ? { spotId: o.spotId } : { label: o.label }));
      if ((poll?.options ?? []).some((o: any) => o.label === name)) { setNotice('이미 장소 투표 후보에 있어요.'); return; }
      await gatheringApi.setPlacePoll(gatheringId, [...current, { label: name }]);
      setNotice(`"${name}"을(를) 장소 투표 후보에 넣었어요. 새로고침하면 투표 카드에 보여요.`);
    } catch (e: any) {
      setError(e?.response?.data?.message || '후보로 넣지 못했어요.');
    }
  };

  if (list == null) return null;
  const cur = list[idx];
  const r = cur?.result;

  return (
    <section aria-labelledby="ai-title" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 id="ai-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>🤖 AI 출사 추천</h2>
        {cur && (cur.source === 'AI'
          ? <span style={{ ...chip, background: COLORS.primaryLight, color: COLORS.primary }}>AI 생성</span>
          : <span style={{ ...chip, background: '#FFF6E5', color: '#B45309' }}>샘플 — 실제 장소 아님</span>)}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: COLORS.textMuted }}>출사 날짜·지역·계절과 참여자 촬영 취향으로 장소와 제철 음식을 제안해요.</p>

      {!cur ? (
        <p style={{ margin: '0 0 12px', fontSize: 14, color: COLORS.textSecondary }}>아직 받은 추천이 없어요.</p>
      ) : (
        <div>
          {r.summary && <p style={{ margin: '0 0 12px', fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{r.summary}</p>}
          <div style={{ display: 'grid', gap: 10 }}>
            {r.places.map((p: any, i: number) => (
              <article key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: COLORS.text }}>{p.name}</strong>
                  {p.area && <span style={{ fontSize: 12, color: COLORS.textMuted }}>{p.area}</span>}
                </div>
                {p.reason && <p style={{ margin: '6px 0', fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>{p.reason}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
                  {p.bestTime && <span>🕐 {p.bestTime}</span>}
                  {p.concept && <span>🎞 {p.concept}</span>}
                </div>
                {p.shootingPoints?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {p.shootingPoints.map((s: string) => <span key={s} style={{ ...chip, background: COLORS.surfaceDim, color: COLORS.textSecondary }}>📸 {s}</span>)}
                  </div>
                )}
                {p.rainAlternative && <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textSecondary }}>☔ 비 오면: {p.rainAlternative}</div>}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  {cur.source === 'AI' && (
                    <a href={`https://map.kakao.com/?q=${encodeURIComponent(`${p.area ? `${p.area} ` : ''}${p.name}`)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: COLORS.primary }}>
                      카카오맵에서 찾기 ↗
                    </a>
                  )}
                  {isCreator && cur.source === 'AI' && (
                    <button type="button" onClick={() => addCandidate(p.name)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: COLORS.primary, cursor: 'pointer' }}>
                      장소 투표 후보로 +
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {r.foods?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>🍜 제철 음식</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.foods.map((f: any) => <span key={f.name} title={f.note} style={{ ...chip, background: COLORS.surfaceDim, color: COLORS.textSecondary }}>{f.name}</span>)}
              </div>
            </div>
          )}
          {[['맛집 찾기', r.restaurantTip], ['교통', r.transport], ['주차', r.parking], ['날씨·개화', r.weatherNote]].filter(([, v]) => v).map(([k, v]) => (
            <p key={k} style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.textSecondary }}><b style={{ color: COLORS.text }}>{k}</b> · {v}</p>
          ))}
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: COLORS.surfaceDim, fontSize: 12, color: COLORS.textSecondary }}>
            AI가 만든 정보예요. 주소·영업시간·날씨·개화 상태는 방문 전에 꼭 확인해 주세요.
            {cur.question ? ` (질문: ${cur.question})` : ''}
          </div>
          {list.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: COLORS.textMuted }}>
              <button type="button" disabled={idx >= list.length - 1} onClick={() => setIdx(idx + 1)} style={pager}>‹ 이전 추천</button>
              <span>{idx + 1} / {list.length}</span>
              <button type="button" disabled={idx === 0} onClick={() => setIdx(idx - 1)} style={pager}>다음 ›</button>
            </div>
          )}
        </div>
      )}

      {canRequest ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <input aria-label="AI에게 추가 질문" value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="추가 질문(선택) — 예: 야경 위주로, 비 올 때 대안"
            style={{ flex: '1 1 220px', height: 40, borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: '0 12px', fontSize: 14 }} />
          <Button size="sm" loading={busy} onClick={request}>{cur ? '다시 추천받기' : '추천받기'}</Button>
        </div>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: COLORS.textMuted }}>로그인하고 참가 신청하면 추천을 받을 수 있어요.</p>
      )}
      {notice && <div role="status" style={{ marginTop: 8, fontSize: 13, color: COLORS.successText }}>{notice}</div>}
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: COLORS.danger }}>{error}</div>}
    </section>
  );
}

const chip: React.CSSProperties = { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999 };
const pager: React.CSSProperties = { background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: COLORS.textSecondary, cursor: 'pointer' };
