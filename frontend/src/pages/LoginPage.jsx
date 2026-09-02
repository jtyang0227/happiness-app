import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';
import Logo from '../components/common/Logo';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr]   = useState('');

  const validate = () => {
    const e = {};
    if (!form.email.trim())              e.email    = '이메일을 입력해주세요.';
    else if (!EMAIL_RE.test(form.email)) e.email    = '올바른 이메일 형식이 아닙니다.';
    if (!form.password)                  e.password = '비밀번호를 입력해주세요.';
    return e;
  };

  const handleChange = ({ target: { name, value } }) => {
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
    setApiErr('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setApiErr(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes lp-fadeup {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Root split layout ── */
        .lp-root {
          display: flex;
          min-height: 100vh;
        }

        /* ── Brand panel (left) ── */
        .lp-brand {
          width: 46%;
          flex-shrink: 0;
          background: ${COLORS.darkBg};
        }
        .lp-brand-desktop {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding: 48px 40px;
        }
        .lp-brand-mobile {
          display: none;
        }

        /* ── Form panel (right) ── */
        .lp-form-panel {
          flex: 1;
          background: ${COLORS.surface};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
        }
        .lp-form-inner {
          width: 100%;
          max-width: 380px;
          animation: lp-fadeup 0.4s ease both;
        }

        /* ── Input focus state ── */
        .lp-input:focus {
          border-color: ${COLORS.primary} !important;
          outline: none;
          box-shadow: 0 0 0 3px ${COLORS.primaryLight} !important;
        }

        /* ── Mobile breakpoint ── */
        @media (max-width: 767px) {
          .lp-root { flex-direction: column; }
          .lp-brand { width: 100%; }
          .lp-brand-desktop { display: none; }
          .lp-brand-mobile {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 22px 24px;
          }
          .lp-form-panel {
            align-items: flex-start;
            padding: 32px 24px 48px;
          }
        }
      `}</style>

      <div className="lp-root">

        {/* ══════════════════════════════════════
            브랜드 패널 — 왼쪽 (데스크탑 전용)
        ══════════════════════════════════════ */}
        <div className="lp-brand">

          {/* 데스크탑: 모자이크 + 브랜드 텍스트 */}
          <div className="lp-brand-desktop">
            {/* 포토 프레임 모자이크 */}
            <div style={{ flex: 1, position: 'relative', minHeight: 200 }}>
              {/* 프레임 A — 왼쪽 tall */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '51%',
                bottom: 48,
                background: COLORS.darkSurface,
                borderRadius: 10,
                border: `1px solid ${COLORS.darkBorder}`,
              }} />
              {/* 프레임 B — 오른쪽 상단 */}
              <div style={{
                position: 'absolute',
                top: 0, right: 0,
                width: '44%',
                height: '55%',
                background: COLORS.darkElevated,
                borderRadius: 10,
                border: `1px solid ${COLORS.darkBorder}`,
              }} />
              {/* 프레임 C — 오른쪽 하단 */}
              <div style={{
                position: 'absolute',
                bottom: 0, right: 0,
                width: '44%',
                height: '40%',
                background: COLORS.darkSurface,
                borderRadius: 10,
                border: `1px solid ${COLORS.darkBorder}`,
              }} />
              {/* Primary 액센트 라인 */}
              <div style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                width: '38%',
                height: 3,
                background: COLORS.primary,
                borderRadius: 2,
              }} />
            </div>

            {/* 브랜드 텍스트 */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <Logo variant="white" size={30} />
              </div>
              <div style={{
                color: COLORS.darkText,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.8px',
                lineHeight: 1.2,
                marginBottom: 14,
              }}>
                Happiness
              </div>
              <div style={{
                color: COLORS.darkTextSub,
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.7,
              }}>
                사진으로 말하는 포트폴리오.<br />
                당신의 작품을 세상과 나누세요.
              </div>
            </div>
          </div>

          {/* 모바일: compact 헤더 */}
          <div className="lp-brand-mobile">
            <Logo variant="white" size={26} />
            <span style={{
              color: COLORS.darkText,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.4px',
            }}>
              Happiness
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════
            폼 패널 — 오른쪽
        ══════════════════════════════════════ */}
        <div className="lp-form-panel">
          <div className="lp-form-inner">

            <h2 style={{
              color: COLORS.text,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.6px',
              marginBottom: 6,
            }}>
              로그인
            </h2>
            <p style={{
              color: COLORS.textMuted,
              fontSize: 14,
              marginBottom: 28,
              lineHeight: 1.5,
            }}>
              계속하려면 로그인해주세요.
            </p>

            {/* API 에러 배너 */}
            {apiErr && (
              <div style={{
                background: COLORS.dangerTonal,
                border: `1px solid ${COLORS.danger}`,
                borderRadius: 10,
                padding: '11px 14px',
                color: COLORS.danger,
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.45,
              }}>
                {apiErr}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <Field label="이메일" error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="lp-input"
                  style={inputStyle(!!errors.email)}
                />
              </Field>
              <Field label="비밀번호" error={errors.password}>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="lp-input"
                  style={inputStyle(!!errors.password)}
                />
              </Field>

              <PrimaryBtn type="submit" loading={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </PrimaryBtn>
            </form>

            {/* 간편 로그인(소셜) — OAuth 앱 키 발급 전까지 비활성화
            <Divider label="간편 로그인" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <SocialBtn bg="#FEE500" color="rgba(0,0,0,0.85)" icon="💬" label="카카오로 계속하기"
                onClick={() => {
                  const key = process.env.REACT_APP_KAKAO_APP_KEY;
                  const uri = process.env.REACT_APP_KAKAO_REDIRECT_URI || `${window.location.origin}/oauth/kakao/callback`;
                  if (!key) { alert('카카오 앱 키가 설정되지 않았습니다.'); return; }
                  window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${key}&redirect_uri=${encodeURIComponent(uri)}&response_type=code`;
                }}
              />
              <SocialBtn bg="#03C75A" color="#fff" icon="N" label="네이버로 계속하기"
                iconStyle={{ fontWeight: 900, fontSize: 15 }}
                onClick={() => {
                  const id  = process.env.REACT_APP_NAVER_CLIENT_ID;
                  const uri = process.env.REACT_APP_NAVER_REDIRECT_URI || `${window.location.origin}/oauth/naver/callback`;
                  if (!id) { alert('네이버 클라이언트 ID가 설정되지 않았습니다.'); return; }
                  const state = Math.random().toString(36).slice(2);
                  sessionStorage.setItem('naver_oauth_state', state);
                  window.location.href = `https://nid.naver.com/oauth2.0/authorize?client_id=${id}&redirect_uri=${encodeURIComponent(uri)}&response_type=code&state=${state}`;
                }}
              />
              <SocialBtn bg="rgba(255,255,255,0.92)" color="#3c4043" icon="G" label="Google로 계속하기"
                iconStyle={{ fontWeight: 700, fontSize: 15, color: '#4285F4' }}
                onClick={() => {
                  const id  = process.env.REACT_APP_GOOGLE_CLIENT_ID;
                  const uri = process.env.REACT_APP_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/google/callback`;
                  if (!id) { alert('Google 클라이언트 ID가 설정되지 않았습니다.'); return; }
                  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=${encodeURIComponent(uri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}`;
                }}
              />
              <SocialBtn bg="#000" color="#fff" icon="⬡" label="Apple로 계속하기"
                iconStyle={{ fontSize: 17 }}
                onClick={() => {
                  const id  = process.env.REACT_APP_APPLE_CLIENT_ID;
                  const uri = process.env.REACT_APP_APPLE_REDIRECT_URI;
                  if (!id || !uri) { alert('Apple 로그인이 설정되지 않았습니다.'); return; }
                  const state = Math.random().toString(36).slice(2);
                  window.location.href = `https://appleid.apple.com/auth/authorize?client_id=${id}&redirect_uri=${encodeURIComponent(uri)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=${state}`;
                }}
              />
            </div>
            */}

            <div style={{
              marginTop: 24,
              textAlign: 'center',
              color: COLORS.textMuted,
              fontSize: 13,
            }}>
              계정이 없으신가요?{' '}
              <Link to="/signup" style={{ color: COLORS.primary, fontWeight: 700 }}>
                회원가입
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 7,
        letterSpacing: '0.04em',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ color: COLORS.danger, fontSize: 11, marginTop: 5 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    background: COLORS.surfaceDim,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
    color: COLORS.text,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };
}

function PrimaryBtn({ children, loading, type = 'submit' }) {
  return (
    <button
      type={type}
      disabled={loading}
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: 14,
        border: 'none',
        background: loading ? COLORS.textHint : COLORS.primary,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        marginTop: 8,
        letterSpacing: '-0.2px',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = COLORS.primaryDark; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = COLORS.primary; }}
    >
      {children}
    </button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      <span style={{ color: COLORS.textHint, fontSize: 11 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
    </div>
  );
}

function SocialBtn({ bg, color, icon, label, onClick, iconStyle = {}, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px',
        borderRadius: 13,
        border: 'none',
        background: bg,
        color,
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'opacity 0.15s',
        cursor: 'pointer',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      <span style={{ fontSize: 17, lineHeight: 1, ...iconStyle }}>{icon}</span>
      {label}
    </button>
  );
}
