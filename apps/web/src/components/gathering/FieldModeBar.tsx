import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import gatheringApi from '../../services/gatheringApi';

/** SNAPDAY 현장 모드 — 진행 중 안내 + 만든 사람·관리자의 출사 시작/종료(이중 확인) */
export default function FieldModeBar({ gathering, canManage, onChanged }: { gathering: any; canManage: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const st = gathering.status;
  const startable = ['RECRUITING', 'RECRUITMENT_CLOSED', 'SCHEDULED'].includes(st);

  const act = async (fn: () => Promise<any>, msg: string) => {
    if (!window.confirm(msg)) return;
    setBusy(true); setError('');
    try { await fn(); onChanged(); } catch (e: any) { setError(e?.response?.data?.message || '처리하지 못했어요.'); } finally { setBusy(false); }
  };

  if (st === 'ONGOING') {
    return (
      <section aria-live="polite" style={{ ...box, borderColor: COLORS.dangerTonal }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>
              <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: COLORS.danger, marginRight: 8, animation: 'pulse 1.6s ease-in-out infinite' }} />
              출사 진행 중
            </div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>현장 사진과 글을 아래 피드에 올려 주세요. 스토리도 만들 수 있어요.</div>
          </div>
          {canManage && <Button variant="danger" size="sm" loading={busy} onClick={() => act(() => gatheringApi.endOuting(gathering.id), '출사를 종료할까요?\n피드 작성이 닫히고 앨범·베스트 포토 투표가 열립니다.')}>출사 종료</Button>}
        </div>
        {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: COLORS.danger }}>{error}</div>}
      </section>
    );
  }
  if (startable && canManage) {
    return (
      <section style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: COLORS.textSecondary }}>출사 당일이 되면 시작해 주세요. 참여자에게 알림이 가고 현장 피드가 열려요.</div>
          <Button size="sm" loading={busy} onClick={() => act(() => gatheringApi.startOuting(gathering.id), `'${gathering.title}' 출사를 시작할까요?${st === 'RECRUITING' ? '\n모집도 함께 마감됩니다.' : ''}`)}>🎬 출사 시작</Button>
        </div>
        {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: COLORS.danger }}>{error}</div>}
      </section>
    );
  }
  return null;
}

const box: React.CSSProperties = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 20 };
