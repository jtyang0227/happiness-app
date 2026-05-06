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
    else if (form.password.length < 6) errs.password = '비밀번호는 최소 6자 이상이어야 합니다.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '13px 16px',
    borderRadius: 10,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.darkBorder}`,
    background: 'rgba(255,255,255,0.05)',
    color: COLORS.darkText,
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.darkBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.primary, letterSpacing: '-1px', marginBottom: 8 }}>
            ✦ Cosmos
          </div>
          <div style={{ color: COLORS.darkTextSecondary, fontSize: 14 }}>
            당신의 세계를 공유하세요
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: COLORS.darkCard,
            borderRadius: 20,
            padding: 32,
            border: `1px solid ${COLORS.darkBorder}`,
            boxShadow: '0 8px 40px rgba(91,110,245,0.15)',
          }}
        >
          <h2 style={{ color: COLORS.darkText, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
            로그인
          </h2>

          {apiError && (
            <div
              style={{
                background: 'rgba(229,62,62,0.12)',
                border: '1px solid rgba(229,62,62,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#ff8080',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: COLORS.darkTextSecondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                이메일
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={inputStyle(!!errors.email)}
                autoComplete="email"
              />
              {errors.email && (
                <div style={{ color: '#ff8080', fontSize: 12, marginTop: 4 }}>{errors.email}</div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: COLORS.darkTextSecondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={inputStyle(!!errors.password)}
                autoComplete="current-password"
              />
              {errors.password && (
                <div style={{ color: '#ff8080', fontSize: 12, marginTop: 4 }}>{errors.password}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: loading ? '#4a4a7a' : COLORS.primary,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', color: COLORS.darkTextSecondary, fontSize: 14 }}>
            계정이 없으신가요?{' '}
            <Link to="/signup" style={{ color: COLORS.primary, fontWeight: 700, textDecoration: 'none' }}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
