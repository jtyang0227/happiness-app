import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';
import { inquiryApi } from '../../services/api';

const NAV_ITEMS = [
  { to: '/explore',   label: '탐색'   },
  { to: '/',          label: '갤러리', end: true },
  { to: '/series',    label: '시리즈' },
  { to: '/list',      label: '목록'   },
  { to: '/photo/new', label: '등록'   },
  { to: '/inbox',     label: '문의함', badge: true },
  { to: '/profile',   label: '프로필' },
];

export default function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    inquiryApi.getUnreadCount(user.id)
      .then(data => setUnreadCount(typeof data === 'number' ? data : data?.count ?? 0))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* PC 헤더 — 768px 이상에서만 표시 */}
      <style>{`
        @media (max-width: 767px) {
          .happiness-pc-header { display: none !important; }
        }
        @media (min-width: 768px) {
          .happiness-bottom-nav { display: none !important; }
        }
      `}</style>

      <header className="happiness-pc-header" style={{
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
            {NAV_ITEMS.map(({ to, label, end, badge }) => (
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
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                })}
              >
                {label}
                {badge && unreadCount > 0 && (
                  <span style={{
                    background: COLORS.primary, color: '#fff',
                    fontSize: 10, fontWeight: 800,
                    minWidth: 16, height: 16, borderRadius: 8,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Avatar Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                outline: dropdownOpen ? `2px solid ${COLORS.primaryLight}` : 'none',
                borderRadius: 30,
              }}
              aria-label="사용자 메뉴"
              aria-expanded={dropdownOpen}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: user?.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
                overflow: 'hidden', flexShrink: 0,
                border: `2px solid ${dropdownOpen ? COLORS.primary : COLORS.border}`,
                transition: 'border-color 0.15s',
              }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (user?.name || user?.email || '?').charAt(0).toUpperCase()
                }
              </div>
              <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1 }}>▾</span>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(91,110,245,0.14)',
                minWidth: 210, zIndex: 200,
                overflow: 'hidden',
              }}>
                {/* 사용자 정보 */}
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{user?.name || '사용자'}</div>
                  {user?.profileName && (
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>@{user.profileName}</div>
                  )}
                </div>
                {/* 메뉴 항목 */}
                {[
                  { icon: '👤', label: '프로필 보기', action: () => { navigate('/profile'); setDropdownOpen(false); } },
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 16px', border: 'none',
                    background: 'none', cursor: 'pointer', fontSize: 14,
                    color: COLORS.text, textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = COLORS.primaryLight; e.currentTarget.style.color = COLORS.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = COLORS.text; }}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
                <div style={{ height: 1, background: COLORS.border, margin: '4px 0' }} />
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 16px', border: 'none',
                  background: 'none', cursor: 'pointer', fontSize: 14,
                  color: COLORS.danger, textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff0f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <span>🚪</span> 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 모바일 하단 탭바 — 768px 미만에서만 표시 */}
      <BottomNav onLogout={handleLogout} />
    </>
  );
}

const BOTTOM_NAV_ITEMS = [
  { to: '/explore',   label: '탐색',  icon: '🔭', end: false },
  { to: '/',          label: '갤러리', icon: '✦',  end: true  },
  { to: '/photo/new', label: '등록',  icon: '+',  end: false, isCenter: true },
  { to: '/list',      label: '목록',  icon: '☰',  end: false },
  { to: '/profile',   label: '프로필', icon: '◎',  end: false },
];

function BottomNav({ onLogout }) {
  return (
    <nav className="happiness-bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      height: 'calc(60px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {BOTTOM_NAV_ITEMS.map(({ to, label, icon, end, isCenter }) => (
        <NavLink
          key={to} to={to} end={end}
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: isCenter ? 0 : 3,
            textDecoration: 'none', flex: 1,
            color: isActive && !isCenter ? COLORS.primary : COLORS.textMuted,
            transition: 'color 0.2s, transform 0.2s',
            transform: isActive && !isCenter ? 'scale(1.05)' : 'scale(1)',
          })}
        >
          {isCenter ? (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 26, fontWeight: 700,
              boxShadow: `0 4px 16px rgba(91,110,245,0.45)`,
              marginBottom: 2,
            }}>
              +
            </div>
          ) : (
            <>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
