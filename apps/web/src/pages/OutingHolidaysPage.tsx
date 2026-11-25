import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import Button from '../components/common/Button';
import { FormField, Input } from '../components/common/Input';
import useAuthStore from '../store/authStore';
import outingApi, { errorMessage, isAdminUser } from '../services/outingApi';

/* SNAPDAY 공휴일 관리(관리자) — 공공데이터포털 가져오기(서버 HOLIDAY_API_KEY) 또는 직접 등록. 날짜를 코드에 박지 않는다. */

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export default function OutingHolidaysPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s: any) => s.user);
  const year = Number(params.get('year')) || 2027;
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', substitute: false });

  const load = useCallback(() => {
    setList(null);
    outingApi.listHolidays(year).then(setList).catch((e) => { setList([]); setError(errorMessage(e, '공휴일을 불러오지 못했어요.')); });
  }, [year]);
  useEffect(() => { load(); }, [load]);

  if (!isAdminUser(user)) {
    return <div style={{ padding: 40, textAlign: 'center', color: COLORS.textSecondary }}>관리자만 볼 수 있는 화면이에요.</div>;
  }

  const act = async (fn: () => Promise<any>, ok: (r: any) => string, fallback: string) => {
    setBusy(true); setError(''); setNotice('');
    try { const r = await fn(); setNotice(ok(r)); load(); } catch (e) { setError(errorMessage(e, fallback)); } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <button onClick={() => navigate(`/gatherings/polls?year=${year}`)} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← 출사 투표</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text }}>공휴일 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="이전 해" onClick={() => setParams({ year: String(year - 1) })} style={yearBtn}>‹</button>
            <span style={{ fontWeight: 700, minWidth: 64, textAlign: 'center' }}>{year}년</span>
            <button aria-label="다음 해" onClick={() => setParams({ year: String(year + 1) })} style={yearBtn}>›</button>
          </div>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: COLORS.textMuted }}>
          투표를 만들 때 이 목록의 공휴일이 후보로 들어가요(이미 만든 투표에는 평일 추가로 넣어 주세요). 공공데이터포털 "특일 정보" 키가 서버에 있으면 한 번에 가져올 수 있어요.
        </p>
        {error && <div role="alert" style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 14, marginBottom: 12 }}>{error}</div>}
        {notice && <div role="status" style={{ padding: '12px 16px', borderRadius: 10, background: COLORS.successTonal, color: COLORS.successText, fontSize: 14, marginBottom: 12 }}>{notice}</div>}

        <div style={panel}>
          <Button variant="secondary" loading={busy} onClick={() => act(() => outingApi.importHolidays(year), (r) => `${r.year}년 공휴일 ${r.imported}건을 가져왔어요.`, '가져오지 못했어요.')}>
            공공데이터포털에서 {year}년 가져오기
          </Button>
        </div>

        <div style={{ ...panel, marginTop: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>직접 등록</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}><FormField id="hd-date" label="날짜"><Input id="hd-date" type="date" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} /></FormField></div>
            <div style={{ flex: '2 1 200px' }}><FormField id="hd-name" label="이름"><Input id="hd-name" value={form.name} maxLength={50} placeholder="예: 삼일절" onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></FormField></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 }}>
            <input type="checkbox" checked={form.substitute} onChange={(e) => setForm({ ...form, substitute: e.target.checked })} /> 대체공휴일
          </label>
          <Button disabled={!form.date || !form.name.trim()} loading={busy}
            onClick={() => act(() => outingApi.addHoliday(form), () => { setForm({ date: '', name: '', substitute: false }); return '등록했어요.'; }, '등록하지 못했어요.')}>
            등록
          </Button>
        </div>

        <div style={{ ...panel, marginTop: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>{year}년 공휴일 {list ? `${list.length}일` : ''}</h2>
          {list == null ? <p style={{ color: COLORS.textMuted, margin: 0 }}>불러오는 중…</p>
            : list.length === 0 ? <p style={{ color: COLORS.textMuted, margin: 0 }}>등록된 공휴일이 없어요. 가져오거나 직접 등록해 주세요.</p>
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {list.map((h) => (
                  <li key={h.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderTop: `1px solid ${COLORS.borderLight}` }}>
                    <span style={{ fontSize: 14, color: COLORS.text }}>
                      {h.date} ({WD[new Date(`${h.date}T00:00:00Z`).getUTCDay()]}) · <b>{h.name}</b>
                      {h.substitute && <span style={{ marginLeft: 6, fontSize: 12, color: COLORS.danger }}>대체</span>}
                      <span style={{ marginLeft: 6, fontSize: 12, color: COLORS.textMuted }}>{h.source === 'API' ? '공공데이터' : '직접 등록'}</span>
                    </span>
                    <Button size="sm" variant="ghost" loading={busy}
                      onClick={() => window.confirm(`${h.date} ${h.name}을(를) 지울까요?`) && act(() => outingApi.deleteHoliday(h.date), () => '지웠어요.', '지우지 못했어요.')}>
                      삭제
                    </Button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
const yearBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textSecondary, fontSize: 18, cursor: 'pointer' };
