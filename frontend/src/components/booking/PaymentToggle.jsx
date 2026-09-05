import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import { bookingApi } from '../../services/bookingApi';

function Row({ label, status, amount, onToggle, onAmountChange, saving }) {
  const received = status === 'RECEIVED';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: COLORS.textSecondary, width: 44, flexShrink: 0 }}>{label}</span>
      <button
        onClick={onToggle}
        disabled={saving}
        style={{
          padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${received ? COLORS.success : COLORS.border}`,
          background: received ? COLORS.successTonal : COLORS.surface,
          color: received ? COLORS.success : COLORS.textSecondary,
          fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0,
        }}
      >
        {received ? '✓ 수령 완료' : '미수령'}
      </button>
      <input
        type="number"
        min="0"
        placeholder="금액(선택)"
        value={amount ?? ''}
        onChange={onAmountChange}
        style={{
          flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8,
          border: `1.5px solid ${COLORS.border}`, fontSize: 12, color: COLORS.text, outline: 'none',
        }}
      />
      <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>원</span>
    </div>
  );
}

export default function PaymentToggle({ booking, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [depositAmount, setDepositAmount] = useState(booking.depositAmount ?? '');
  const [balanceAmount, setBalanceAmount] = useState(booking.balanceAmount ?? '');

  const send = async (patch) => {
    setSaving(true);
    try {
      const updated = await bookingApi.updatePayment(booking.id, patch);
      onUpdate && onUpdate(updated);
    } catch {
      // 실패 시 다음 조작에서 재시도 — 별도 에러 배너 없이 조용히 무시(토글 자체는 비파괴적)
    } finally {
      setSaving(false);
    }
  };

  const toggleDeposit = () => send({ depositStatus: booking.depositStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED' });
  const toggleBalance = () => send({ balanceStatus: booking.balanceStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED' });

  const commitDepositAmount = () => {
    const v = depositAmount === '' ? null : parseInt(depositAmount, 10);
    if (v !== null && (Number.isNaN(v) || v === booking.depositAmount)) return;
    send({ depositAmount: v });
  };
  const commitBalanceAmount = () => {
    const v = balanceAmount === '' ? null : parseInt(balanceAmount, 10);
    if (v !== null && (Number.isNaN(v) || v === booking.balanceAmount)) return;
    send({ balanceAmount: v });
  };

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
        💰 수금 현황 {saving && <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 400 }}>저장 중...</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row
          label="계약금"
          status={booking.depositStatus}
          amount={depositAmount}
          onToggle={toggleDeposit}
          onAmountChange={e => setDepositAmount(e.target.value)}
          saving={saving}
        />
        <Row
          label="잔금"
          status={booking.balanceStatus}
          amount={balanceAmount}
          onToggle={toggleBalance}
          onAmountChange={e => setBalanceAmount(e.target.value)}
          saving={saving}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => { commitDepositAmount(); commitBalanceAmount(); }}
          style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textSecondary, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
        >
          금액 저장
        </button>
      </div>
    </div>
  );
}
