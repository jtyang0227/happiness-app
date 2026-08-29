import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';
import { mq } from '../../constants/breakpoints';

const NAV_ITEMS = [
  { to: '/admin',               label: '📊 대시보드',     end: true },
  { to: '/admin/gallery-order', label: '🖼️ 갤러리 순서' },
  { to: '/admin/members',       label: '👥 회원 관리' },
  { to: '/admin/photos',        label: '📷 사진 관리' },
  { to: '/admin/categories',    label: '🏷️ 카테고리' },
  { to: '/admin/tags',          label: '🔖 태그 관리' },
  { to: '/admin/moderation',    label: '🚨 신고 관리' },
];

const SIDEBAR_W = 220;

export default function AdminLayout({ children, currentPageTitle = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout?.();
    navigate('/login');
  };

  const sidebar = (
    <div style={{
      width: SIDEBAR_W, minHeight: '100vh',
      background: COLORS.surface,
      borderRight: `1px solid ${COLORS.border}`,
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 200,
    }}>
      {/* 로고 */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.primary }}>🛠️ Happiness Admin</div>
      </div>

      {/* 네비게이션 */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-link--active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${COLORS.border}` }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1px solid ${COLORS.dangerTonal}`,
            background: COLORS.dangerTonal,
            color: COLORS.danger, cursor: 'pointer', textAlign: 'left',
          }}
        >
          🚪 로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg }}>
      {/* 데스크탑 사이드바 */}
      <style>{`
        ${mq.mobile} { .admin-sidebar { display: none !important; } }
        ${mq.tabletUp} { .admin-mobile-overlay { display: none !important; } }
        .admin-nav-link { display: block; padding: 10px 14px; border-radius: 10px; margin-bottom: 2px; text-decoration: none; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-left: 3px solid transparent; transition: background 0.15s, color 0.15s; }
        .admin-nav-link:hover { background: ${COLORS.surfaceDim}; color: ${COLORS.primary}; }
        .admin-nav-link--active { background: ${COLORS.primaryLight}; color: ${COLORS.primary}; border-left: 3px solid ${COLORS.primary}; }
        .admin-nav-link--active:hover { background: ${COLORS.primaryLight}; }
      `}</style>
      <div className="admin-sidebar">{sidebar}</div>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 190 }}
        >
          <div onClick={e => e.stopPropagation()}>{sidebar}</div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, marginLeft: 0, display: 'flex', flexDirection: 'column' }}>
        <style>{`${mq.tabletUp} { .admin-content { margin-left: ${SIDEBAR_W}px !important; } }`}</style>

        {/* 상단바 */}
        <div style={{
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '0 24px', height: 58, display: 'flex', alignItems: 'center',
          gap: 16, position: 'sticky', top: 0, zIndex: 100,
        }}>
          {/* 모바일 햄버거 */}
          <button
            className="admin-mobile-overlay"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
              color: COLORS.textSecondary, padding: 4,
            }}
          >☰</button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, flex: 1, margin: 0 }}>
            {currentPageTitle}
          </h2>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{user?.email}</span>
        </div>

        {/* 페이지 콘텐츠 */}
        <div className="admin-content" style={{ flex: 1, padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
