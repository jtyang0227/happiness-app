import React from 'react';
import { COLORS } from '../../constants/colors';

/**
 * 모임 인원 진행 막대 — 현재/정원, 최소 인원 표시선, 대기자 수 (DESIGN_PROMPT_gathering-reminders.md).
 * 최소 인원을 넘으면 "진행 확정" 쪽 문구, 정원이 차면 대기 안내.
 */
export default function CapacityBar({ count, max, min, waiting }: { count: number; max: number; min?: number | null; waiting?: number }) {
  const safeMax = Math.max(1, max || 1);
  const ratio = Math.min(1, (count || 0) / safeMax);
  const full = count >= safeMax;
  const minOk = min == null || count >= min;
  const fill = full ? COLORS.text : COLORS.primary;
  let note: string;
  if (full) note = waiting ? `정원이 찼어요 · 대기 ${waiting}명` : '정원이 찼어요 · 지금 신청하면 대기자로 등록돼요';
  else if (!minOk) note = `최소 ${min}명까지 ${min - count}명 더 필요해요`;
  else note = `${safeMax - count}자리 남았어요`;

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <strong style={{ fontSize: 15, color: COLORS.text }}>{count}</strong>
        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>/ {safeMax}명</span>
        {min != null && <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 'auto' }}>최소 {min}명</span>}
      </div>
      <div
        role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={safeMax}
        aria-label={`참여 인원 ${count}/${safeMax}명${min != null ? `, 최소 ${min}명` : ''}`}
        style={{ position: 'relative', height: 8, background: COLORS.border, borderRadius: 999, marginTop: 6, overflow: 'visible' }}
      >
        <div style={{ width: `${ratio * 100}%`, height: '100%', background: fill, borderRadius: 999, transition: 'width 0.3s ease' }} />
        {min != null && min < safeMax && (
          <div aria-hidden style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${(min / safeMax) * 100}% - 1px)`, width: 2, background: COLORS.textSecondary, borderRadius: 1 }} />
        )}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, color: !minOk && !full ? COLORS.danger : COLORS.textMuted, fontWeight: !minOk && !full ? 600 : 400 }}>{note}</div>
    </div>
  );
}
