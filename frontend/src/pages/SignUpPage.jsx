import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { glassDark, SPRING } from '../constants/glass';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const INITIAL = {
  name: '', email: '', password: '', confirmPassword: '',
  tel: '', profileName: '', instagramId: '',
};

export default function SignUpPage() {
  const { signup }  = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr]   = useState('');
  const [checking, setChecking] = useState({ email: false, profileName: false });

  const handleChange = ({ target: { name, value } }) => {
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
    setApiErr('');
  };

  const checkEmail = async () => {
    if (!form.email || !EMAIL_RE.test(form.email)) return;
    setChecking(p => ({ ...p, email: true }));
    try {
      const res = await authApi.checkEmail(form.email);
      if (res?.exists || res?.duplicate)
        setErrors(p => ({ ...p, email: '이미 사용 중인 이메일입니다.' }));
    } catch { /* ignore */ }
    finally { setChecking(p => ({ ...p, email: false })); }
  };

  const checkProfileName = async () => {
    if (!form.profileName.trim()) return;
    setChecking(p => ({ ...p, profileName: true }));
    try {
      const res = await authApi.checkProfileName(form.profileName);
      if (res?.exists || res?.duplicate)
        setErrors(p => ({ ...p, profileName: '이미 사용 중인 포트폴리오 주소입니다.' }));
    } catch { /* ignore */ }
    finally { setChecking(p => ({ ...p, profileName: false })); }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())               e.name            = '이름을 입력해주세요.';
    if (!form.email.trim())              e.email           = '이메일을 입력해주세요.';
    else if (!EMAIL_RE.test(form.email)) e.email           = '올바른 이메일 형식이 아닙니다.';
    if (!form.password)                  e.password        = '비밀번호를 입력해주세요.';
    else if (form.password.length < 8)   e.password        = '최소 8자 이상 입력해주세요.';
    if (form.password !== form.confirmPassword) e.confirmPassword = '비밀번호가 일치하지 않습니다.';
    if (!form.profileName.trim())        e.profileName     = '포트폴리오 주소를 입력해주세요.';
    else if (!/^[a-z0-9-]+$/.test(form.profileName)) e.profileName = '영문 소문자, 숫자, 하이픈만 사용 가능합니다.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setApiErr('');
    try {
      const { confirmPassword, ...payload } = form;
      await signup(payload);
      navigate('/');
    } catch (err) {
      setApiErr(err.message || '회원가입에 실패했습니다.');
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
        width: '100%', maxWidth: 420,
        animation: 'glassIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #5b6ef5 0%, #a78bfa 100%)',
            fontSize: 24, marginBottom: 14,
            boxShadow: '0 8px 32px rgba(91,110,245,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}>✦</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.8px' }}>
            Happiness
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 5 }}>
            새 계정 만들기
          </div>
        </div>

        {/* Glass card */}
        <div style={{
          ...glassDark('dark'),
          borderRadius: 28,
          padding: '28px 24px 24px',
        }}>
          <h2 style={{ color: '#f0f0ff', fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.4px' }}>
            회원가입
          </h2>

          {apiErr && (
            <div style={{
              background: 'rgba(255,77,109,0.12)',
              border: '0.5px solid rgba(255,77,109,0.35)',
              borderRadius: 12, padding: '11px 14px',
              color: '#ff8098', fontSize: 13, marginBottom: 16,
            }}>{apiErr}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <DarkField label="이름" error={errors.name}>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange} placeholder="홍길동"
                autoComplete="name"
                style={darkInput(!!errors.name)}
              />
            </DarkField>

            <DarkField label="이메일" error={errors.email}>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} onBlur={checkEmail}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={darkInput(!!errors.email)}
                />
                {checking.email && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  }}>확인 중...</span>
                )}
              </div>
            </DarkField>

            <DarkField label="비밀번호" error={errors.password}>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="최소 8자 이상"
                autoComplete="new-password"
                style={darkInput(!!errors.password)}
              />
            </DarkField>

            <DarkField label="비밀번호 확인" error={errors.confirmPassword}>
              <input
                type="password" name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                style={darkInput(!!errors.confirmPassword)}
              />
            </DarkField>

            <DarkField label="포트폴리오 주소" error={errors.profileName}
              hint="영문 소문자, 숫자, 하이픈만 사용 가능">
              <div style={{ position: 'relative' }}>
                <input
                  type="text" name="profileName" value={form.profileName}
                  onChange={handleChange} onBlur={checkProfileName}
                  placeholder="my-portfolio"
                  autoComplete="off"
                  style={darkInput(!!errors.profileName)}
                />
                {checking.profileName && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  }}>확인 중...</span>
                )}
              </div>
            </DarkField>

            <DarkField label="전화번호 (선택)">
              <input
                type="tel" name="tel" value={form.tel}
                onChange={handleChange} placeholder="010-0000-0000"
                autoComplete="tel"
                style={darkInput(false)}
              />
            </DarkField>

            <DarkField label="인스타그램 ID (선택)">
              <input
                type="text" name="instagramId" value={form.instagramId}
                onChange={handleChange} placeholder="instagram_id"
                autoComplete="off"
                style={darkInput(false)}
              />
            </DarkField>

            <PrimaryBtn type="submit" loading={loading}>
              {loading ? '가입 중...' : '가입하기'}
            </PrimaryBtn>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: '#a78bfa', fontWeight: 700 }}>로그인</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function DarkField({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', color: 'rgba(255,255,255,0.5)',
        fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em',
      }}>{label}</label>
      {children}
      {hint && !error && (
        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 4 }}>{hint}</div>
      )}
      {error && <div style={{ color: '#ff8098', fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function darkInput(hasError) {
  return {
    width: '100%', padding: '11px 14px',
    borderRadius: 12,
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
