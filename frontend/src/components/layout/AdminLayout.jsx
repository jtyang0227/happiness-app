import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/admin',               label: '📊 대시보드',     end: true },
  { to: '/admin/gallery-order', label: '🖼️ 갤러리 순서' },
  { to: '/admin/members',       label: '👥 회원 관리' },
  { to: '/admin/photos',        label: '📷 사진 관리' },
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
      width: SIDEBAR_W, minHeight: '100vh', background: '#fff',
      borderRight: '1px solid #e5e5ed', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 200,
    }}>
      {/* 로고 */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e5e5ed' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#5b6ef5' }}>🛠️ Happiness Admin</div>
      </div>

      {/* 네비게이션 */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              display: 'block', padding: '10px 14px', borderRadius: 8,
              marginBottom: 2, textDecoration: 'none', fontSize: 13, fontWeight: 600,
              background: isActive ? '#eef0ff' : 'transparent',
              color: isActive ? '#5b6ef5' : '#5c5c7a',
              borderLeft: isActive ? '3px solid #5b6ef5' : '3px solid transparent',
              transition: 'background 0.15s',
            })}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f8'; }}
            onMouseLeave={e => { }}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #e5e5ed' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1.5px solid #fecaca', background: '#fff5f5',
            color: '#e53e3e', cursor: 'pointer', textAlign: 'left',
          }}
        >
          🚪 로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fb' }}>
      {/* 데스크탑 사이드바 */}
      <style>{`
        @media (max-width: 768px) { .admin-sidebar { display: none !important; } }
        @media (min-width: 769px) { .admin-mobile-overlay { display: none !important; } }
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
        <style>{`@media (min-width: 769px) { .admin-content { margin-left: ${SIDEBAR_W}px !important; } }`}</style>

        {/* 상단바 */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e5ed',
          padding: '0 24px', height: 56, display: 'flex', alignItems: 'center',
          gap: 16, position: 'sticky', top: 0, zIndex: 100,
        }}>
          {/* 모바일 햄버거 */}
          <button
            className="admin-mobile-overlay"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
              color: '#5c5c7a', padding: 4,
            }}
          >☰</button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', flex: 1, margin: 0 }}>
            {currentPageTitle}
          </h2>
          <span style={{ fontSize: 12, color: '#9090b0' }}>{user?.email}</span>
        </div>

        {/* 페이지 콘텐츠 */}
        <div className="admin-content" style={{ flex: 1, padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
