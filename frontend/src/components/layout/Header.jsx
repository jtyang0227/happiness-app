import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';

const NAV_ITEMS = [
  { to: '/explore', label: '탐색' },
  { to: '/',        label: '갤러리', end: true },
  { to: '/list',    label: '목록' },
  { to: '/photo/new', label: '등록' },
  { to: '/profile', label: '프로필' },
];

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkStyle = (isActive) => ({
    textDecoration: 'none',
    color: isActive ? COLORS.primary : COLORS.textSecondary,
    fontWeight: isActive ? 700 : 500,
    fontSize: 14,
    padding: '6px 12px',
    borderRadius: 8,
    background: isActive ? '#eef0ff' : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 8px rgba(91,110,245,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, letterSpacing: '-0.5px' }}>
            ✦ Cosmos
          </span>
        </NavLink>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => linkStyle(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            color: COLORS.textSecondary,
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = COLORS.danger;
            e.currentTarget.style.color = COLORS.danger;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = COLORS.border;
            e.currentTarget.style.color = COLORS.textSecondary;
          }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
