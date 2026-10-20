import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { inquiryApi } from '../../services/api';
import meetApi from '../../services/meetApi';

/**
 * 업무 공통 탭 (PLANNING_nav-consolidation.md 2.3) — 한눈에 · 문의 · 예약 · 일정 · 약속 · 납품.
 * 흩어져 있던 업무 화면 5개 상단에 같은 탭을 붙여 한 섹션처럼 오간다. 기존 URL은 그대로.
 * 높이는 WORKSPACE_TABS_HEIGHT로 고정 — 화면 높이를 꽉 채우는 데스크탑 2단 레이아웃이 이 값만큼 빼서 쓴다.
 */
export const WORKSPACE_TABS_HEIGHT = 57;

export const WORKSPACE_PATHS = ['/workspace', '/inbox', '/bookings', '/calendar', '/meets', '/deliveries'];

const TABS = [
  { to: '/workspace',  label: '한눈에' },
  { to: '/inbox',      label: '문의', badge: 'inquiry' },
  { to: '/bookings',   label: '예약' },
  { to: '/calendar',   label: '일정' },
  { to: '/meets',      label: '약속', badge: 'meets' },
  { to: '/deliveries', label: '납품' },
];

export default function WorkspaceTabs() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ inquiry: 0, meets: 0 });

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.allSettled([inquiryApi.getUnreadCount(user.id), meetApi.getPendingCount()]).then(([inq, mt]) => {
      if (!alive) return;
      const inquiry = inq.status === 'fulfilled' ? (typeof inq.value === 'number' ? inq.value : inq.value?.count ?? 0) : 0;
      const meets = mt.status === 'fulfilled' ? mt.value || 0 : 0;
      setCounts({ inquiry, meets });
    });
    return () => { alive = false; };
  }, [user?.id]);

  return (
    <nav aria-label="업무" style={{
      height: WORKSPACE_TABS_HEIGHT, boxSizing: 'border-box', background: COLORS.surface,
      borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center',
    }}>
      <style>{`
        .ws-tab { transition: background 0.15s ease, color 0.15s ease; }
        .ws-tab:not(.active):hover { color: ${COLORS.text} !important; background: ${COLORS.surfaceDim}; }
        .ws-tab:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 16px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const n = t.badge ? counts[t.badge] : 0;
          return (
            <NavLink key={t.to} to={t.to} end className={({ isActive }) => `ws-tab${isActive ? ' active' : ''}`}
              // 활성 색은 style 함수로 — 인라인 color가 .active 클래스보다 우선해 어두운 칩에 어두운 글자가 되던 문제 방지
              style={({ isActive }) => ({
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999,
                fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? COLORS.text : 'transparent',
                color: isActive ? COLORS.surface : COLORS.textSecondary,
              })}>
              {t.label}
              {n > 0 && (
                <span aria-label={`${n}건`} style={{
                  minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: COLORS.danger, color: '#fff',
                  fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{n > 99 ? '99+' : n}</span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
