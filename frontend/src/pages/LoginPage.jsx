import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { glassDark, SPRING } from '../constants/glass';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
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
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', position: 'relative', zIndex: 1,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        animation: 'glassIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 60, height: 60, borderRadius: 20,
            background: 'linear-gradient(135deg, #5b6ef5 0%, #a78bfa 100%)',
            fontSize: 26, marginBottom: 16,
            boxShadow: '0 8px 32px rgba(91,110,245,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}>✦</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.8px' }}>
            Happiness
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6 }}>
            포트폴리오 갤러리
          </div>
        </div>

        {/* Glass card */}
        <div style={{
          ...glassDark('dark'),
          borderRadius: 28,
          padding: '32px 28px 28px',
        }}>
          <h2 style={{ color: '#f0f0ff', fontSize: 19, fontWeight: 700, marginBottom: 22, letterSpacing: '-0.4px' }}>
            로그인
          </h2>

          {apiErr && (
            <div style={{
              background: 'rgba(255,77,109,0.12)',
              border: '0.5px solid rgba(255,77,109,0.35)',
              borderRadius: 12, padding: '11px 14px',
              color: '#ff8098', fontSize: 13, marginBottom: 18,
            }}>{apiErr}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <DarkField label="이메일" error={errors.email}>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="your@email.com"
                autoComplete="email"
                style={darkInput(!!errors.email)}
              />
            </DarkField>
            <DarkField label="비밀번호" error={errors.password}>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••"
                autoComplete="current-password"
                style={darkInput(!!errors.password)}
              />
            </DarkField>

            <PrimaryBtn type="submit" loading={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </PrimaryBtn>
          </form>

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

          <div style={{ marginTop: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            계정이 없으신가요?{' '}
            <Link to="/signup" style={{ color: '#a78bfa', fontWeight: 700 }}>회원가입</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function DarkField({ label, error, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{
        display: 'block', color: 'rgba(255,255,255,0.5)',
        fontSize: 12, fontWeight: 600, marginBottom: 7, letterSpacing: '0.04em',
      }}>{label}</label>
      {children}
      {error && <div style={{ color: '#ff8098', fontSize: 11, marginTop: 5 }}>{error}</div>}
    </div>
  );
}

function darkInput(hasError) {
  return {
    width: '100%', padding: '12px 15px',
    borderRadius: 13,
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `0.5px solid ${hasError ? 'rgba(255,77,109,0.5)' : 'rgba(255,255,255,0.12)'}`,
    color: '#f0f0ff', fontSize: 14, outline: 'none',
    boxShadow: hasError
      ? '0 0 0 3px rgba(255,77,109,0.15), inset 0 1px 0 rgba(255,255,255,0.06)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
}

function PrimaryBtn({ children, loading, type = 'submit' }) {
  return (
    <button
      type={type}
      disabled={loading}
      style={{
        width: '100%', padding: '13px',
        borderRadius: 14, border: 'none',
        background: loading
          ? 'rgba(91,110,245,0.4)'
          : 'linear-gradient(135deg, #5b6ef5 0%, #a78bfa 100%)',
        color: '#fff', fontSize: 15, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading
          ? 'none'
          : '0 4px 20px rgba(91,110,245,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        transition: `all 0.2s ${SPRING}`,
        marginTop: 6, letterSpacing: '-0.2px',
      }}
      onMouseEnter={e => {
        if (!loading) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,110,245,0.6), inset 0 1px 0 rgba(255,255,255,0.25)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(91,110,245,0.45), inset 0 1px 0 rgba(255,255,255,0.25)';
      }}
    >
      {children}
    </button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.10)' }} />
      <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.10)' }} />
    </div>
  );
}

function SocialBtn({ bg, color, icon, label, onClick, iconStyle = {}, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', padding: '12px',
        borderRadius: 13, border: 'none',
        background: bg, color,
        fontSize: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: `opacity 0.15s, transform 0.2s ${SPRING}`,
        cursor: 'pointer',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.01)'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = ''; }}
    >
      <span style={{ fontSize: 17, lineHeight: 1, ...iconStyle }}>{icon}</span>
      {label}
    </button>
  );
}
