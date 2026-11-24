import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { NAV_ITEMS, BOTTOM_NAV_ITEMS, visibleItems, isMenuActive } from './navConfig';
import NavIcon from './NavIcon';

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
      <BottomNav
        items={visibleItems(BOTTOM_NAV_ITEMS, !!user?.id)}
        badges={{ workspace: unreadCount + pendingMeets, gatherings: gatheringNotifCount }}
        pathname={pathname}
        user={user}
      />
    </>
  );
}

/**
 * 모바일 하단 탭 — 아이콘만(DESIGN_PROMPT_bottom-nav-icons.md). 항목·배지는 navConfig에서 오므로 탭 수가 바뀌어도 이 코드는 그대로다.
 * 글자가 없으니 aria-label(배지 수 포함)·title로 이름을 전한다.
 */
const BAR = COLORS.text; // 하단 바: 단색 다크 알약(blur 없음 — Toss 플랫 규칙)

function TabAvatar({ user, active }) {
  const [broken, setBroken] = useState(false);
  const initial = (user?.name || user?.profileName || '?').trim().charAt(0).toUpperCase();
  return (
    <span style={{
      width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: COLORS.primary, color: '#fff', fontSize: 12, fontWeight: 800,
      boxShadow: active ? `0 0 0 2px ${BAR}, 0 0 0 4px #fff` : '0 0 0 1.5px rgba(255,255,255,0.35)',
      transition: 'box-shadow 0.2s ease-out',
    }}>
      {user?.avatarUrl && !broken
        ? <img src={user.avatarUrl} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </span>
  );
}

function BottomNav({ items, badges, pathname, user }) {
  const tabs = items.filter(i => !i.isCenter);
  const action = items.find(i => i.isCenter);
  return (
    <nav className="h-mobile" aria-label="주요 메뉴" style={{
      position: 'fixed', left: 12, right: 12, zIndex: 200,
      bottom: 'calc(10px + env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
    }}>
      <style>{`
        .bn-tab { transition: transform 0.12s ease-out; -webkit-tap-highlight-color: transparent; pointer-events: auto; }
        .bn-tab:active { transform: scale(0.92); }
        .bn-tab:focus-visible { outline: 2px solid #fff; outline-offset: -2px; border-radius: 999px; }
        .bn-cap { transition: background-color 0.2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .bn-tab, .bn-cap { transition: none; } }
      `}</style>
      <div style={{
        flex: 1, height: 60, minWidth: 0, pointerEvents: 'auto',
        background: BAR, borderRadius: 999,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', padding: '0 6px',
      }}>
        {tabs.map((item) => {
          const { to, label, icon, badge, avatar } = item;
          const count = badge ? badges[badge] || 0 : 0;
          const name = count > 0 ? `${label}, 새 알림 ${count}건` : label;
          // NavLink와 같은 규칙(경로 또는 그 하위) + 업무처럼 여러 화면을 묶은 탭은 match 목록으로 판정
          const isActive = isMenuActive(item, pathname, pathname === to || pathname.startsWith(`${to}/`));
          return (
            <Link
              key={to} to={to} className="bn-tab" aria-label={name} title={label} aria-current={isActive ? 'page' : undefined}
              style={{ flex: 1, minWidth: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              {/* Instagram처럼 활성 탭만 둥근 캡슐 배경 */}
              <span className="bn-cap" style={{
                position: 'relative', width: 52, height: 40, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
              }}>
                {avatar && user?.id
                  ? <TabAvatar user={user} active={isActive} />
                  : <NavIcon name={icon} size={24} active={isActive} cut={BAR} />}
                {count > 0 && (
                  <span aria-hidden="true" style={{
                    position: 'absolute', top: 1, right: 6, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 99,
                    background: COLORS.danger, color: '#fff', fontSize: 9, fontWeight: 800, border: `2px solid ${BAR}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'content-box', lineHeight: 1,
                  }}>{count > 99 ? '99+' : count}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Cosmos의 검색 원처럼 주요 행동은 알약 밖 별도 원 */}
      {action && (
        <Link to={action.to} className="bn-tab" aria-label={action.label} title={action.label} style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0, textDecoration: 'none',
          background: COLORS.primary, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <NavIcon name={action.icon} size={26} />
        </Link>
      )}
    </nav>
  );
}
