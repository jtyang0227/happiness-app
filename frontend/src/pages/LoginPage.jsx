import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = '이메일을 입력해주세요.';
    else if (!EMAIL_REGEX.test(form.email)) errs.email = '올바른 이메일 형식이 아닙니다.';
    if (!form.password) errs.password = '비밀번호를 입력해주세요.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
    setApiError('');
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
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    width: '100%', padding: '13px 16px',
    borderRadius: 12,
    fontSize: 15, outline: 'none',
    color: COLORS.darkText,
    background: 'rgba(255,255,255,0.05)',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.darkBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
              fontSize: 22, boxShadow: '0 6px 24px rgba(91,110,245,0.4)',
            }}>✦</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.darkText, letterSpacing: '-0.5px' }}>
            Happiness
          </div>
          <div style={{ color: COLORS.darkTextSub, fontSize: 14, marginTop: 6 }}>
            포트폴리오 갤러리
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: COLORS.darkSurface,
          borderRadius: 22,
          padding: '32px 28px',
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ color: COLORS.darkText, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
            로그인
          </h2>

          {apiError && (
            <div style={{
              background: 'rgba(229,62,62,0.12)', border: '1px solid rgba(229,62,62,0.25)',
              borderRadius: 10, padding: '11px 14px',
              color: '#ff9090', fontSize: 13, marginBottom: 18,
            }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Field label="이메일" error={errors.email}>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="your@email.com"
                autoComplete="email"
                style={{ ...inputBase, border: `1.5px solid ${errors.email ? COLORS.danger : COLORS.darkBorder}` }}
              />
            </Field>

            <Field label="비밀번호" error={errors.password}>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inputBase, border: `1.5px solid ${errors.password ? COLORS.danger : COLORS.darkBorder}` }}
              />
            </Field>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, border: 'none',
                background: loading
                  ? 'rgba(91,110,245,0.5)'
                  : 'linear-gradient(135deg, #5b6ef5, #7c8ff7)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(91,110,245,0.35)',
                transition: 'all 0.2s',
                marginTop: 8,
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div style={{ marginTop: 22, textAlign: 'center', color: COLORS.darkTextSub, fontSize: 14 }}>
            계정이 없으신가요?{' '}
            <Link to="/signup" style={{ color: COLORS.accent, fontWeight: 700, textDecoration: 'none' }}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', color: COLORS.darkTextSub,
        fontSize: 13, fontWeight: 600, marginBottom: 7,
      }}>
        {label}
      </label>
      {children}
      {error && <div style={{ color: '#ff9090', fontSize: 12, marginTop: 5 }}>{error}</div>}
    </div>
  );
}
