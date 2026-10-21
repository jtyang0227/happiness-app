import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/colors';
import { SPRING } from '../../constants/animations';
import { BP, mq } from '../../constants/breakpoints';
import { inquiryApi } from '../../services/api';
import meetApi from '../../services/meetApi';
import { gatheringApi } from '../../services/gatheringApi';
import { LANG_META, SUPPORTED_LANGS } from '../../i18n';
import Logo from '../common/Logo';
import { WORKSPACE_PATHS } from '../workspace/WorkspaceTabs';

// 메뉴 통합 (PLANNING_nav-consolidation.md) — 예전 10개(탐색·갤러리·시리즈·목록·등록/편집·문의함·일정·약속·모임·프로필)를
// 목적별 4개로: 탐색(갤러리·목록 흡수) · 내 작업(시리즈) · 업무(문의·예약·일정·약속·납품 허브) · 모임.
// 올리기는 메뉴가 아니라 행동이라 오른쪽 버튼으로, 프로필은 아바타 메뉴로 옮겼다.
const NAV_ITEMS = [
  { to: '/explore',    label: '둘러보기' },
  { to: '/series',     label: '내 작업', auth: true },
  { to: '/workspace',  label: '업무', badge: 'workspace', match: WORKSPACE_PATHS, auth: true },
  { to: '/gatherings', label: '모임', badge: 'gatherings' },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/explore',   label: '둘러보기', icon: '⊙' },
  { to: '/series',    label: '내 작업', icon: '✦' },
  { to: '/photo/new', label: '올리기', icon: '+', isCenter: true },
  { to: '/workspace', label: '업무',   icon: '▤', match: WORKSPACE_PATHS, badge: 'workspace' },
  { to: '/profile',   label: '프로필', icon: '◎' },
];

/** 업무처럼 여러 화면을 한 메뉴로 묶은 경우, 하위 경로 어디에 있어도 활성으로 */
function isMenuActive(item, pathname, isActive) {
  if (!item.match) return isActive;
  return item.match.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

function LangSwitcher() {
  const { lang, changeLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 34, padding: '0 12px', borderRadius: 10,
          background: open ? COLORS.surfaceDim : 'transparent',
          border: `1px solid ${open ? COLORS.textHint : COLORS.border}`,
          color: open ? COLORS.text : COLORS.textSecondary,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = COLORS.surfaceDim; e.currentTarget.style.color = COLORS.text; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.textSecondary; }}}
      >
        🌐 {lang.toUpperCase()} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 160, background: COLORS.surface,
          border: `1px solid ${COLORS.border}`, borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
          padding: 6, zIndex: 300,
        }}>
          <p style={{
            margin: 0, padding: '6px 10px 4px',
            fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            언어 선택
          </p>
          {SUPPORTED_LANGS.map(code => {
            const meta = LANG_META[code];
            const isActive = lang === code;
            return (
              <button
                key={code}
                onClick={() => { changeLang(code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 10px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isActive ? COLORS.primaryLight : 'transparent',
                  color: isActive ? COLORS.primary : COLORS.textSecondary,
                  fontSize: 14, transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLORS.surfaceDim; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18 }}>{meta.flag}</span>
                <span style={{ flex: 1 }}>{meta.nativeLabel}</span>
                {isActive && <span style={{ fontSize: 14, color: COLORS.primary, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingMeets, setPendingMeets] = useState(0);
  const [gatheringNotifCount, setGatheringNotifCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    inquiryApi.getUnreadCount(user.id)
      .then(data => setUnreadCount(typeof data === 'number' ? data : data?.count ?? 0))
      .catch(() => {});
    meetApi.getPendingCount()
      .then(count => setPendingMeets(count || 0))
      .catch(() => {});
    gatheringApi.getUnreadCount()
      .then(data => setGatheringNotifCount(typeof data === 'number' ? data : data?.count ?? 0))
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
        ${mq.mobile} { .h-pc { display: none !important; } }
        ${mq.tabletUp} { .h-mobile { display: none !important; } }
        .nav-link {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 13px; border-radius: 10px;
          font-size: 14px; font-weight: 500;
          color: ${COLORS.textSecondary}; text-decoration: none;
          transition: color 0.15s;
          position: relative;
        }
        .nav-link:hover { color: ${COLORS.text}; }
        .nav-link.active {
          color: ${COLORS.text};
          font-weight: 700;
        }
        .avatar-btn { transition: transform 0.2s ${SPRING}; }
        .upload-btn { transition: background 0.15s ease, transform 0.12s ease; }
        .upload-btn:hover { background: ${COLORS.primaryDark} !important; }
        .upload-btn:active, .login-btn:active { transform: scale(0.97); }
        .upload-btn:focus-visible, .login-btn:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .login-btn:hover { background: ${COLORS.surfaceDim}; }
        .avatar-btn:hover { transform: scale(1.08); }
      `}</style>

      {/* ── PC Header — Cosmos 화이트 에디토리얼 ──────────── */}
      <header className="h-pc" style={{
        position: 'sticky', top: 0, zIndex: 200,
        height: 58,
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        borderRadius: 0,
      }}>
        <div style={{
          maxWidth: BP.xl, margin: '0 auto',
          padding: '0 20px', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* Logo */}
          <NavLink to="/explore" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none' }}>
            <Logo variant="black" size={22} />
            <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Happiness
            </span>
          </NavLink>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV_ITEMS.filter(item => !item.auth || user?.id).map((item) => {
              const { to, label, badge } = item;
              // 업무 배지 = 새 문의 + 응답 대기 약속 (기존 폴링 값 합산)
              const badgeCount = badge === 'workspace' ? unreadCount + pendingMeets : badge === 'gatherings' ? gatheringNotifCount : 0;
              return (
                <NavLink
                  key={to} to={to}
                  className={({ isActive }) => `nav-link${isMenuActive(item, pathname, isActive) ? ' active' : ''}`}
                >
                  {label}
                  {badge && badgeCount > 0 && (
                    <span style={{
                      background: COLORS.danger, color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      minWidth: 15, height: 15, borderRadius: 99,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px',
                    }}>{badgeCount > 99 ? '99+' : badgeCount}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* 올리기 — 메뉴가 아니라 행동이라 버튼으로 */}
          {user?.id && (
            <NavLink to="/photo/new" className="upload-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 34, padding: '0 14px', borderRadius: 10,
              background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
            }}>＋ 올리기</NavLink>
          )}

          {/* Language Switcher */}
          <LangSwitcher />

          {!user?.id ? (
            <NavLink to="/login" className="login-btn" style={{
              display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 10, flexShrink: 0,
              border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>로그인</NavLink>
          ) : (
          /* Avatar dropdown */
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
                  : COLORS.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                overflow: 'hidden', flexShrink: 0,
                border: `1.5px solid ${dropdownOpen ? COLORS.primary : COLORS.border}`,
                boxShadow: dropdownOpen ? `0 0 0 3px ${COLORS.primaryLight}` : 'none',
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
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 16,
                minWidth: 210, zIndex: 300,
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
                animation: `fadeInUp 0.28s ${SPRING} both`,
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{user?.name || '사용자'}</div>
                  {user?.profileName && (
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>@{user.profileName}</div>
                  )}
                </div>
                <button
                  onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '11px 16px',
                    fontSize: 14, color: COLORS.textSecondary, textAlign: 'left',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = COLORS.surfaceDim; e.currentTarget.style.color = COLORS.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.textSecondary; }}
                >
                  <span>◎</span> 프로필 보기
                </button>
                {user?.profileName && (
                  <button
                    onClick={() => { navigate(`/portfolio/${user.profileName}`); setDropdownOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '11px 16px',
                      fontSize: 14, color: COLORS.textSecondary, textAlign: 'left',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = COLORS.surfaceDim; e.currentTarget.style.color = COLORS.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.textSecondary; }}
                  >
                    <span>🌐</span> 내 포트폴리오 보기
                  </button>
                )}
                <div style={{ height: 1, background: COLORS.border, margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '11px 16px',
                    fontSize: 14, color: COLORS.danger, textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = COLORS.dangerTonal; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>🚪</span> 로그아웃
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      <BottomNav workspaceCount={unreadCount + pendingMeets} pathname={pathname} />
    </>
  );
}

function BottomNav({ workspaceCount, pathname }) {
  return (
    <nav className="h-mobile" style={{
      position: 'fixed', left: 12, right: 12, zIndex: 200,
      bottom: 'calc(10px + env(safe-area-inset-bottom))',
      height: 60,
      background: COLORS.surface,
      borderRadius: 999,
      border: `1px solid ${COLORS.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {BOTTOM_NAV_ITEMS.map((item) => {
        const { to, label, icon, isCenter, badge } = item;
        return (
        <NavLink
          key={to} to={to}
          style={({ isActive: raw }) => {
            const isActive = isMenuActive(item, pathname, raw);
            return ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: isCenter ? 0 : 3,
            textDecoration: 'none', flex: 1, padding: '6px 0',
            color: isActive && !isCenter ? COLORS.text : COLORS.textMuted,
            transition: `color 0.2s, transform 0.25s ${SPRING}`,
            transform: 'scale(1)',
            position: 'relative',
          });
          }}
        >
          {({ isActive: raw }) => {
            const isActive = isMenuActive(item, pathname, raw);
            return (
            <>
              {isActive && !isCenter && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 99,
                  background: COLORS.primary,
                }} />
              )}
              {isCenter ? (
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: COLORS.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700,
                }}>+</div>
              ) : (
                <>
                  <span style={{ fontSize: 19, lineHeight: 1, position: 'relative' }}>
                    {icon}
                    {badge === 'workspace' && workspaceCount > 0 && (
                      <span aria-label={`처리할 일 ${workspaceCount}건`} style={{
                        position: 'absolute', top: -4, right: -10, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 99,
                        background: COLORS.danger, color: '#fff', fontSize: 9, fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{workspaceCount > 99 ? '99+' : workspaceCount}</span>
                    )}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
                </>
              )}
            </>
            );
          }}
        </NavLink>
        );
      })}
    </nav>
  );
}
