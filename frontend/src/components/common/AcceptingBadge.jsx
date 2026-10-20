import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';

/**
 * "예약 받는 중" 배지 — 작가가 예약 가용 설정을 켜둔 경우에만 표시한다(PLANNING_work-discovery.md 3.2).
 * 상태 표시라 브랜드 블루가 아닌 의미 컬러(success)를 쓴다. 글자는 대비 확보용 successText.
 * `to`를 주면 "날짜 보기 →"가 붙은 링크(포트폴리오·작업 페이지), 없으면 정적 배지(탐색 카드).
 */
export default function AcceptingBadge({ to, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: to ? '5px 10px' : '3px 8px', borderRadius: 999,
    background: COLORS.successTonal, color: COLORS.successText,
    fontSize: to ? 12 : 11, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap',
    textDecoration: 'none', ...style,
  };
  const dot = <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success, flexShrink: 0 }} />;

  if (!to) {
    return <span style={base}>{dot}예약 받는 중</span>;
  }
  return (
    <>
      <style>{`
        .accepting-badge-link { transition: filter 0.15s ease; }
        .accepting-badge-link:hover { filter: brightness(0.96); }
        .accepting-badge-link:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <Link to={to} className="accepting-badge-link" style={base}>
        {dot}예약 받는 중 · 날짜 보기 →
      </Link>
    </>
  );
}
