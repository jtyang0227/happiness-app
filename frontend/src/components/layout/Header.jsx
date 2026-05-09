import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';

const NAV_ITEMS = [
  { to: '/explore',   label: '탐색'  },
  { to: '/',          label: '갤러리', end: true },
  { to: '/list',      label: '목록'  },
  { to: '/photo/new', label: '등록'  },
  { to: '/profile',   label: '프로필' },
];

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: 58,
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${COLORS.borderLight}`,
      boxShadow: '0 1px 0 rgba(91,110,245,0.06)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 17, color: COLORS.primary }}>✦</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.5px' }}>
            Happiness
          </span>
        </NavLink>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? COLORS.primary : COLORS.textSecondary,
                padding: '6px 13px',
                borderRadius: 10,
                background: isActive ? COLORS.primaryLight : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 14px', borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            color: COLORS.textSecondary,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = COLORS.danger;
            e.currentTarget.style.color = COLORS.danger;
            e.currentTarget.style.background = COLORS.dangerTonal;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = COLORS.border;
            e.currentTarget.style.color = COLORS.textSecondary;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
