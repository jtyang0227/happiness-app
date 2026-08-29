import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import Logo from '../components/common/Logo';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^01[0-9]-\d{3,4}-\d{4}$/;

const INITIAL = {
  name: '', email: '', password: '', confirmPassword: '',
  tel: '', profileName: '', instagramId: '', termsAgreed: false,
};

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function SignUpPage() {
  const { signup }  = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState({ email: '', profileName: '' });
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr]   = useState('');
  const [checking, setChecking] = useState({ email: false, profileName: false });
  const [showPw, setShowPw] = useState({ password: false, confirmPassword: false });

  const handleChange = ({ target: { name, value } }) => {
    const nextValue = name === 'tel' ? formatPhone(value) : value;
    setForm(p => ({ ...p, [name]: nextValue }));
    setErrors(p => ({ ...p, [name]: '' }));
    setSuccess(p => (name in p ? { ...p, [name]: '' } : p));
    setApiErr('');
  };

  const toggleShowPw = (field) => {
    setShowPw(p => ({ ...p, [field]: !p[field] }));
  };

  const checkEmail = async () => {
    if (!form.email || !EMAIL_RE.test(form.email)) return;
    setChecking(p => ({ ...p, email: true }));
    try {
      const res = await authApi.checkEmail(form.email);
      if (res?.available === false) {
        setErrors(p => ({ ...p, email: '이미 사용 중인 이메일입니다.' }));
        setSuccess(p => ({ ...p, email: '' }));
      } else if (res?.available === true) {
        setErrors(p => ({ ...p, email: '' }));
        setSuccess(p => ({ ...p, email: '사용 가능한 이메일입니다.' }));
      }
    } catch { /* ignore */ }
    finally { setChecking(p => ({ ...p, email: false })); }
  };

  const checkProfileName = async () => {
    if (!form.profileName.trim()) return;
    setChecking(p => ({ ...p, profileName: true }));
    try {
      const res = await authApi.checkProfileName(form.profileName);
      if (res?.available === false) {
        setErrors(p => ({ ...p, profileName: '이미 사용 중인 포트폴리오 주소입니다.' }));
        setSuccess(p => ({ ...p, profileName: '' }));
      } else if (res?.available === true) {
        setErrors(p => ({ ...p, profileName: '' }));
        setSuccess(p => ({ ...p, profileName: '사용 가능한 포트폴리오 주소입니다.' }));
      }
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
    if (form.tel && !PHONE_RE.test(form.tel)) e.tel = '올바른 전화번호 형식이 아닙니다.';
    if (!form.termsAgreed)               e.termsAgreed     = '이용약관 및 개인정보처리방침에 동의해주세요.';
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
      // 제출 직전 최종 중복 확인 (blur 없이 바로 제출된 경우 대비)
      const [emailRes, profileRes] = await Promise.all([
        authApi.checkEmail(form.email).catch(() => null),
        authApi.checkProfileName(form.profileName).catch(() => null),
      ]);
      const finalErrs = {};
      if (emailRes?.available === false)   finalErrs.email       = '이미 사용 중인 이메일입니다.';
      if (profileRes?.available === false) finalErrs.profileName = '이미 사용 중인 포트폴리오 주소입니다.';
      if (Object.keys(finalErrs).length) {
        setErrors(p => ({ ...p, ...finalErrs }));
        setLoading(false);
        return;
      }

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
      padding: '24px 20px', background: COLORS.bg,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        animation: 'fadeInUp 0.4s ease both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo variant="black" size={44} />
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>
            새 계정 만들기
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 20,
          padding: '28px 24px 24px',
        }}>
          <h2 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.4px' }}>
            회원가입
          </h2>

          {apiErr && (
            <div style={{
              background: COLORS.dangerTonal,
              border: `1px solid ${COLORS.dangerTonal}`,
              borderRadius: 12, padding: '11px 14px',
              color: COLORS.danger, fontSize: 13, marginBottom: 16,
            }}>{apiErr}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Field label="이름" error={errors.name}>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange} placeholder="홍길동"
                autoComplete="name"
                style={inputStyle(!!errors.name)}
              />
            </Field>

            <Field label="이메일" error={errors.email} success={success.email}>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} onBlur={checkEmail}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={inputStyle(!!errors.email)}
                />
                {checking.email && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, color: COLORS.textHint,
                  }}>확인 중...</span>
                )}
              </div>
            </Field>

            <Field label="비밀번호" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.password ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="최소 8자 이상"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                />
                <EyeToggle shown={showPw.password} onClick={() => toggleShowPw('password')} />
              </div>
            </Field>

            <Field label="비밀번호 확인" error={errors.confirmPassword}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.confirmPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                  onChange={handleChange} placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirmPassword), paddingRight: 44 }}
                />
                <EyeToggle shown={showPw.confirmPassword} onClick={() => toggleShowPw('confirmPassword')} />
              </div>
            </Field>

            <Field label="포트폴리오 주소" error={errors.profileName} success={success.profileName}
              hint="영문 소문자, 숫자, 하이픈만 사용 가능">
              <div style={{ position: 'relative' }}>
                <input
                  type="text" name="profileName" value={form.profileName}
                  onChange={handleChange} onBlur={checkProfileName}
                  placeholder="my-portfolio"
                  autoComplete="off"
                  style={inputStyle(!!errors.profileName)}
                />
                {checking.profileName && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, color: COLORS.textHint,
                  }}>확인 중...</span>
                )}
              </div>
            </Field>

            <Field label="전화번호 (선택)" error={errors.tel}>
              <input
                type="tel" name="tel" value={form.tel}
                onChange={handleChange} placeholder="010-0000-0000"
                autoComplete="tel" inputMode="numeric" maxLength={13}
                style={inputStyle(!!errors.tel)}
              />
            </Field>

            <Field label="인스타그램 ID (선택)">
              <input
                type="text" name="instagramId" value={form.instagramId}
                onChange={handleChange} placeholder="instagram_id"
                autoComplete="off"
                style={inputStyle(false)}
              />
            </Field>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              marginBottom: 18, cursor: 'pointer',
            }}>
              <input
                type="checkbox" name="termsAgreed"
                checked={form.termsAgreed}
                onChange={e => {
                  setForm(p => ({ ...p, termsAgreed: e.target.checked }));
                  setErrors(p => ({ ...p, termsAgreed: '' }));
                }}
                style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', accentColor: COLORS.primary }}
              />
              <span style={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                이용약관 및 개인정보처리방침에 동의합니다.
              </span>
            </label>
            {errors.termsAgreed && (
              <div style={{ color: COLORS.danger, fontSize: 11, marginTop: -12, marginBottom: 14 }}>
                {errors.termsAgreed}
              </div>
            )}

            <PrimaryBtn type="submit" loading={loading}>
              {loading ? '가입 중...' : '가입하기'}
            </PrimaryBtn>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: COLORS.primary, fontWeight: 700 }}>로그인</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function Field({ label, error, success, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', color: COLORS.textSecondary,
        fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em',
      }}>{label}</label>
      {children}
      {hint && !error && !success && (
        <div style={{ color: COLORS.textHint, fontSize: 11, marginTop: 4 }}>{hint}</div>
      )}
      {!error && success && (
        <div style={{ color: COLORS.success, fontSize: 11, marginTop: 4 }}>✓ {success}</div>
      )}
      {error && <div style={{ color: COLORS.danger, fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function EyeToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? '비밀번호 숨기기' : '비밀번호 보이기'}
      style={{
        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: COLORS.textMuted,
      }}
    >
      {shown ? '🙈' : '👁'}
    </button>
  );
}

function inputStyle(hasError) {
  return {
    width: '100%', padding: '11px 14px',
    borderRadius: 12,
    background: COLORS.surfaceDim,
    border: `1px solid ${hasError ? COLORS.danger : COLORS.border}`,
    color: COLORS.text, fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
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
        background: loading ? COLORS.textHint : COLORS.primary,
        color: '#fff', fontSize: 15, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        marginTop: 6, letterSpacing: '-0.2px',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = COLORS.primaryDark; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = COLORS.primary; }}
    >
      {children}
    </button>
  );
}
