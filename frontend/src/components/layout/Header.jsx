import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { C, G, gStyle, glass, glassDark, SPRING } from '../../constants/glass';
import { inquiryApi } from '../../services/api';

const NAV_ITEMS = [
  { to: '/explore',   label: '탐색'     },
  { to: '/',          label: '갤러리', end: true },
  { to: '/series',    label: '시리즈'   },
  { to: '/list',      label: '목록'     },
  { to: '/photo/new', label: '등록'     },
  { to: '/editor',    label: '에디터'   },
  { to: '/inbox',     label: '문의함', badge: true },
  { to: '/profile',   label: '프로필'   },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/explore',   label: '탐색',  icon: '⊙',  end: false },
  { to: '/',          label: '갤러리', icon: '✦',  end: true  },
  { to: '/photo/new', label: '등록',  icon: '+',  end: false, isCenter: true },
  { to: '/list',      label: '목록',  icon: '☰',  end: false },
  { to: '/profile',   label: '프로필', icon: '◎',  end: false },
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
      <style>{`
        @media (max-width: 767px) { .h-pc { display: none !important; } }
        @media (min-width: 768px) { .h-mobile { display: none !important; } }
        .nav-link {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 13px; border-radius: 10px;
          font-size: 14px; font-weight: 500;
          color: #5c5c7a; text-decoration: none;
          transition: background 0.15s, color 0.15s;
          position: relative;
        }
        .nav-link:hover { background: rgba(91,110,245,0.06); color: #1a1a2e; }
        .nav-link.active {
          background: rgba(91,110,245,0.12);
          color: #5b6ef5;
          font-weight: 700;
          border: 1px solid rgba(91,110,245,0.20);
          box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.60), 0 2px 8px rgba(91,110,245,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .avatar-btn { transition: transform 0.2s ${SPRING}; }
        .avatar-btn:hover { transform: scale(1.08); }
      `}</style>

      {/* ── PC Header — V2 glass('strong') 스펙큘러 ──────────── */}
      <header className="h-pc" style={{
        position: 'sticky', top: 0, zIndex: 200,
        height: 58,
        ...glass('strong'),
        borderRadius: 0,
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.50)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 20px', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* Logo */}
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(91,110,245,0.35), inset 0 1.5px 0 rgba(255,255,255,0.30)',
            }}>✦</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px' }}>
              Happiness
            </span>
          </NavLink>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV_ITEMS.map(({ to, label, end, badge }) => (
              <NavLink
                key={to} to={to} end={end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {label}
                {badge && unreadCount > 0 && (
                  <span style={{
                    background: C.danger, color: '#fff',
                    fontSize: 9, fontWeight: 800,
                    minWidth: 15, height: 15, borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Avatar dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className="avatar-btn"
              onClick={() => setDropdownOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
              aria-label="사용자 메뉴"
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: user?.avatarUrl
                  ? 'transparent'
                  : 'linear-gradient(135deg, #6c6ef7, #9b7ff7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                overflow: 'hidden', flexShrink: 0,
                border: `1.5px solid ${dropdownOpen ? '#6c6ef7' : 'rgba(255,255,255,0.15)'}`,
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(108,110,247,0.25)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (user?.name || user?.email || '?').charAt(0).toUpperCase()
                }
              </div>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                ...glass('strong'),
                borderRadius: 16,
                minWidth: 210, zIndex: 300,
                overflow: 'hidden',
                animation: `glassIn 0.28s ${SPRING} both`,
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid rgba(255,255,255,0.42)`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{user?.name || '사용자'}</div>
                  {user?.profileName && (
                    <div style={{ fontSize: 11, color: '#9090b0', marginTop: 2 }}>@{user.profileName}</div>
                  )}
                </div>
                <button
                  onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '11px 16px',
                    fontSize: 14, color: '#5c5c7a', textAlign: 'left',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,110,245,0.08)'; e.currentTarget.style.color = '#5b6ef5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5c5c7a'; }}
                >
                  <span>◎</span> 프로필 보기
                </button>
                <div style={{ height: 1, background: 'rgba(226,226,238,0.7)', margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '11px 16px',
                    fontSize: 14, color: '#e53e3e', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,62,62,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>🚪</span> 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <BottomNav unreadCount={unreadCount} />
    </>
  );
}

function BottomNav({ unreadCount }) {
  return (
    <nav className="h-mobile" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      height: 'calc(60px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      ...glassDark('dark'),
      borderRadius: 0,
      borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {BOTTOM_NAV_ITEMS.map(({ to, label, icon, end, isCenter }) => (
        <NavLink
          key={to} to={to} end={end}
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: isCenter ? 0 : 3,
            textDecoration: 'none', flex: 1, padding: '6px 0',
            color: isActive && !isCenter ? '#a8aaff' : C.textHint,
            transition: `color 0.2s, transform 0.25s ${SPRING}`,
            transform: isActive && !isCenter ? 'scale(1.1)' : 'scale(1)',
          })}
        >
          {isCenter ? (
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c6ef7, #9b7ff7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 22, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(108,110,247,0.5)',
            }}>+</div>
          ) : (
            <>
              <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
