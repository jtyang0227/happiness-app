import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { glassDark, BG, GLASS, GLASS_KEYFRAMES, SPRING } from '../constants/glass';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const INITIAL = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  tel: '',
  profileName: '',
  instagramId: '',
};

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [checking, setChecking] = useState({ email: false, profileName: false });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const checkEmail = async () => {
    if (!form.email || !EMAIL_REGEX.test(form.email)) return;
    setChecking(prev => ({ ...prev, email: true }));
    try {
      const res = await authApi.checkEmail(form.email);
      if (res?.exists || res?.duplicate) {
        setErrors(prev => ({ ...prev, email: '이미 사용 중인 이메일입니다.' }));
      } else {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    } catch {
      /* ignore */
    } finally {
      setChecking(prev => ({ ...prev, email: false }));
    }
  };

  const checkProfileName = async () => {
    if (!form.profileName.trim()) return;
    setChecking(prev => ({ ...prev, profileName: true }));
    try {
      const res = await authApi.checkProfileName(form.profileName);
      if (res?.exists || res?.duplicate) {
        setErrors(prev => ({ ...prev, profileName: '이미 사용 중인 포트폴리오 주소입니다.' }));
      } else {
        setErrors(prev => ({ ...prev, profileName: '' }));
      }
    } catch {
      /* ignore */
    } finally {
      setChecking(prev => ({ ...prev, profileName: false }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.';
    if (!form.email.trim()) errs.email = '이메일을 입력해주세요.';
    else if (!EMAIL_REGEX.test(form.email)) errs.email = '올바른 이메일 형식이 아닙니다.';
    if (!form.password) errs.password = '비밀번호를 입력해주세요.';
    else if (form.password.length < 8) errs.password = '비밀번호는 최소 8자 이상이어야 합니다.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = '비밀번호가 일치하지 않습니다.';
    if (!form.profileName.trim()) errs.profileName = '포트폴리오 주소를 입력해주세요.';
    else if (!/^[a-z0-9-]+$/.test(form.profileName)) errs.profileName = '영문 소문자, 숫자, 하이픈만 사용 가능합니다.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (Object.values(errors).some(Boolean)) return;

    setLoading(true);
    setApiError('');
    try {
      const { confirmPassword, ...payload } = form;
      await signup(payload);
      navigate('/');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: 14,
    border: `1.5px solid ${hasError ? COLORS.danger : 'rgba(255,255,255,0.14)'}`,
    background: 'rgba(8,8,22,0.42)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    color: COLORS.darkText,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: hasError ? '0 0 0 3px rgba(229,62,62,0.15)' : 'inset 0 1.5px 0 rgba(255,255,255,0.06)',
  });

  const Field = ({ label, name, type = 'text', placeholder, onBlur, hint }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: COLORS.darkTextSecondary, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        style={inputStyle(!!errors[name])}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
      {hint && !errors[name] && (
        <div style={{ color: COLORS.darkTextSecondary, fontSize: 11, marginTop: 3 }}>{hint}</div>
      )}
      {errors[name] && (
        <div style={{ color: '#ff8080', fontSize: 12, marginTop: 4 }}>{errors[name]}</div>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG.dark,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{GLASS_KEYFRAMES}</style>
      {/* Boké orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '5%', right: '10%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'bokehFloat 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,110,245,0.18) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'bokehFloat 13s ease-in-out infinite reverse',
        }} />
      </div>
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>
            ✦ Cosmos
          </div>
          <div style={{ color: COLORS.darkTextSecondary, fontSize: 14 }}>새 계정 만들기</div>
        </div>

        <div
          style={{
            ...glassDark('dark'),
            borderRadius: 28,
            padding: 32,
            animation: `glassIn 0.6s ${SPRING} both`,
          }}
        >
          <h2 style={{ color: COLORS.darkText, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
            회원가입
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
            <Field label="이름" name="name" placeholder="홍길동" />
            <Field
              label="이메일"
              name="email"
              type="email"
              placeholder="your@email.com"
              onBlur={checkEmail}
            />
            <Field
              label="비밀번호"
              name="password"
              type="password"
              placeholder="최소 6자 이상"
            />
            <Field
              label="비밀번호 확인"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
            />
            <Field
              label="전화번호"
              name="tel"
              type="tel"
              placeholder="010-0000-0000"
            />
            <Field
              label="포트폴리오 주소 (profileName)"
              name="profileName"
              placeholder="my-portfolio"
              onBlur={checkProfileName}
              hint="영문 소문자, 숫자, 하이픈만 사용 가능"
            />
            <Field
              label="인스타그램 ID (선택)"
              name="instagramId"
              placeholder="instagram_id"
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: loading
                  ? 'rgba(91,110,245,0.45)'
                  : 'linear-gradient(135deg, #5b6ef5 0%, #7c8ff7 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8,
                transition: `all 0.22s ${SPRING}`,
                boxShadow: loading
                  ? 'none'
                  : '0 4px 16px rgba(91,110,245,0.40), inset 0 1.5px 0 rgba(255,255,255,0.25)',
              }}
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', color: COLORS.darkTextSecondary, fontSize: 14 }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: COLORS.primary, fontWeight: 700, textDecoration: 'none' }}>
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
