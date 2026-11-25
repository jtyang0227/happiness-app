import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { mq } from '../constants/breakpoints';
import Button from '../components/common/Button';
import useAuthStore from '../store/authStore';
import outingApi, { errorMessage, isAdminUser } from '../services/outingApi';

/* SNAPDAY 월간 출사 투표 — 한 해 12개월 카드. 기획: DESIGN_PROMPTS/planning/snapday, 디자인: DESIGN_PROMPT_snapday-outing.md 2절 */

const STATUS = {
  OPEN:      { label: '투표 중', bg: COLORS.primaryLight, color: COLORS.primary },
  CLOSED:    { label: '마감',    bg: COLORS.surfaceDim,   color: COLORS.textSecondary },
  CONFIRMED: { label: '확정',    bg: COLORS.successTonal, color: COLORS.successText },
};

function fmtDate(d?: string | null) {
  if (!d) return '';
  const [, m, day] = d.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${d}T00:00:00Z`).getUTCDay()];
  return `${m}월 ${day}일(${wd})`;
}

export default function OutingPollsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s: any) => s.user);
  const admin = isAdminUser(user);
  const year = Number(params.get('year')) || 2027;
  const [polls, setPolls] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<number | null>(null);

  const load = useCallback(() => {
    setPolls(null);
    setError('');
    outingApi.listPolls(year).then(setPolls).catch((e) => { setPolls([]); setError(errorMessage(e, '투표 목록을 불러오지 못했어요.')); });
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const create = async (month: number) => {
    if (!window.confirm(`${year}년 ${month}월 출사 투표를 만들까요?\n그 달의 토·일과 등록된 공휴일이 후보로 들어갑니다.`)) return;
    setCreating(month);
    try {
      const p = await outingApi.createPoll({ year, month });
      navigate(`/gatherings/polls/${p.id}`);
    } catch (e) {
      setError(errorMessage(e, '투표를 만들지 못했어요.'));
    } finally {
      setCreating(null);
    }
  };

  const byMonth = new Map((polls ?? []).map((p) => [p.month, p]));

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <style>{`
        .poll-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        ${mq.upToTablet} { .poll-grid { grid-template-columns:repeat(3,1fr); } }
        ${mq.mobile} { .poll-grid { grid-template-columns:repeat(2,1fr); } }
        @keyframes poll-sk { 0%{opacity:.55} 50%{opacity:1} 100%{opacity:.55} }
      `}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px' }}>
        <button onClick={() => navigate('/gatherings')} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
          ← 모임으로
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ flex: '1 1 240px' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>🗳 월간 출사 투표</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.textMuted }}>달마다 함께 갈 수 있는 날짜를 모아 출사 날짜를 정해요</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="이전 해" onClick={() => setParams({ year: String(year - 1) })} style={yearBtn}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, minWidth: 64, textAlign: 'center' }}>{year}년</span>
            <button aria-label="다음 해" onClick={() => setParams({ year: String(year + 1) })} style={yearBtn}>›</button>
            {admin && <Button variant="secondary" size="sm" onClick={() => navigate(`/gatherings/polls/holidays?year=${year}`)}>공휴일 관리</Button>}
          </div>
        </div>

        {error && <div role="alert" style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14, marginBottom: 16 }}>{error}</div>}

        <div className="poll-grid">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            if (polls == null) return <div key={m} style={{ ...card, height: 112, background: COLORS.surfaceDim, animation: 'poll-sk 1.4s ease-in-out infinite' }} />;
            const p = byMonth.get(m);
            if (!p) {
              return (
                <div key={m} style={{ ...card, border: `1px dashed ${COLORS.border}`, background: 'transparent' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textSecondary }}>{m}월</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 6 }}>투표 없음</div>
                  {admin && (
                    <Button size="sm" variant="ghost" loading={creating === m} onClick={() => create(m)} style={{ marginTop: 8, padding: '4px 0' }}>
                      + 투표 만들기
                    </Button>
                  )}
                </div>
              );
            }
            const st = STATUS[p.status] || STATUS.CLOSED;
            return (
              <button key={m} onClick={() => navigate(`/gatherings/polls/${p.id}`)} style={{ ...card, textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{m}월</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.color }}>
                    {p.status === 'OPEN' && !p.votingOpen ? '시작 전·마감 지남' : st.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                  {p.status === 'CONFIRMED' ? `📅 ${fmtDate(p.confirmedDate)}` : `응답 ${p.voterCount}명 · 후보 ${p.optionCount}일`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16,
  minHeight: 112, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};
const yearBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.textSecondary, fontSize: 18, cursor: 'pointer',
};
