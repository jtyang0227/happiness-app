import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import Logo from '../components/common/Logo';
import {
  PROFILE_NAME_HINT, SIGNUP_FIELDS,
  normalizeOnChange, normalizeOnBlur, validateField, validateAll,
} from '../utils/signupValidation';

const INITIAL = {
  name: '', email: '', password: '', confirmPassword: '',
  tel: '', profileName: '', instagramId: '', termsAgreed: false,
};

// 휴대폰 키보드의 자동 대문자·자동 수정·맞춤법(하이픈→대시 등)을 끄는 입력 속성
const NO_AUTO_FIX = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };

export default function SignUpPage() {
  const { signup }  = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState({ email: '', profileName: '' });
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr]   = useState('');
  const [checking, setChecking] = useState({ email: false, profileName: false });
  const [showPw, setShowPw] = useState({ password: false, confirmPassword: false });
  // 중복 확인 응답이 늦게 와도 "지금 값"에 대한 결과만 반영하려고 최신 값을 ref로 본다
  const formRef = useRef(form);
  formRef.current = form;

  /* 입력(타이핑·붙여넣기·자동완성): 한 번 벗어난 필드만 즉시 재검사 — 처음 입력하는 동안 오류를 먼저 띄우지 않는다 */
  const handleChange = ({ target: { name, value } }) => {
    const nextForm = { ...formRef.current, [name]: normalizeOnChange(name, value) };
    setForm(nextForm);
    setErrors(p => {
      const next = { ...p, [name]: touched[name] ? validateField(name, nextForm) : '' };
      if (name === 'password' && touched.confirmPassword) next.confirmPassword = validateField('confirmPassword', nextForm);
      return next;
    });
    setSuccess(p => (name in p ? { ...p, [name]: '' } : p));
    setApiErr('');
  };

  /* 벗어날 때: 공백·@ 정리 → 형식 검사 → (통과하면) 중복 확인 */
  const handleBlur = ({ target: { name } }) => {
    const raw = formRef.current[name];
    const value = normalizeOnBlur(name, raw);
    const nextForm = value === raw ? formRef.current : { ...formRef.current, [name]: value };
    if (value !== raw) setForm(nextForm);
    setTouched(p => ({ ...p, [name]: true }));
    const msg = validateField(name, nextForm);
    setErrors(p => ({ ...p, [name]: msg }));
    if (!msg && (name === 'email' || name === 'profileName')) checkDuplicate(name, value);
  };

  const checkDuplicate = async (name, value) => {
    setChecking(p => ({ ...p, [name]: true }));
    try {
      const res = name === 'email' ? await authApi.checkEmail(value) : await authApi.checkProfileName(value);
      if (formRef.current[name].trim() !== value) return;  // 그 사이 값이 바뀌었으면 버린다
      const label = name === 'email' ? '이메일' : '포트폴리오 주소';
      // 응답은 ApiResponse 래퍼 { success, data: { available } } — 예전엔 res.available을 읽어 결과가 한 번도 반영되지 않았다
      const available = res?.data?.available;
      if (available === false) {
        setErrors(p => ({ ...p, [name]: `이미 사용 중인 ${label}입니다.` }));
        setSuccess(p => ({ ...p, [name]: '' }));
      } else if (available === true) {
        setErrors(p => ({ ...p, [name]: '' }));
        setSuccess(p => ({ ...p, [name]: `사용 가능한 ${label}입니다.` }));
      }
    } catch { /* 확인 실패는 제출 시 서버가 다시 검사한다 */ }
    finally { setChecking(p => ({ ...p, [name]: false })); }
  };

  const toggleShowPw = (field) => {
    setShowPw(p => ({ ...p, [field]: !p[field] }));
  };

  const focusFirstError = (errs) => {
    const first = SIGNUP_FIELDS.find(f => errs[f]);
    if (first) document.getElementById(`signup-${first}`)?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 벗어나지 않고 바로 제출(자동완성 후 엔터 등)해도 같은 정리·검사를 거친다
    const cleaned = { ...form };
    SIGNUP_FIELDS.forEach(f => { cleaned[f] = normalizeOnBlur(f, cleaned[f]); });
    setForm(cleaned);
    setTouched(Object.fromEntries(SIGNUP_FIELDS.map(f => [f, true])));
    // 형식 오류 + 이미 받아 둔 중복 확인 오류(값을 바꾸면 handleChange가 지우므로 지금 값 기준)를 함께 유지
    const errs = { ...validateAll(cleaned) };
    ['email', 'profileName'].forEach(f => { if (!errs[f] && errors[f]) errs[f] = errors[f]; });
    if (Object.keys(errs).length) { setErrors(errs); focusFirstError(errs); return; }

    setLoading(true);
    setApiErr('');
    try {
      // 제출 직전 최종 중복 확인 (blur 없이 바로 제출된 경우 대비)
      const [emailRes, profileRes] = await Promise.all([
        authApi.checkEmail(cleaned.email).catch(() => null),
        authApi.checkProfileName(cleaned.profileName).catch(() => null),
      ]);
      const finalErrs = {};
      if (emailRes?.data?.available === false)   finalErrs.email       = '이미 사용 중인 이메일입니다.';
      if (profileRes?.data?.available === false) finalErrs.profileName = '이미 사용 중인 포트폴리오 주소입니다.';
      if (Object.keys(finalErrs).length) {
        setErrors(p => ({ ...p, ...finalErrs }));
        setSuccess({ email: '', profileName: '' });
        focusFirstError(finalErrs);
        setLoading(false);
        return;
      }

      const { confirmPassword, ...payload } = cleaned;
      await signup({ ...payload, email: payload.email.toLowerCase() });
      navigate('/');
    } catch (err) {
      setApiErr(err.response?.data?.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 입력란 공통 속성 — id·이벤트·접근성 연결
  const bind = (name) => ({
    id: `signup-${name}`, name, value: form[name],
    onChange: handleChange, onBlur: handleBlur,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `signup-${name}-msg`,
  });

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
            <Field id="signup-name" label="이름" error={errors.name}>
              <input
                type="text" {...bind('name')} placeholder="홍길동"
                autoComplete="name"
                style={inputStyle(!!errors.name)}
              />
            </Field>

            <Field id="signup-email" label="이메일" error={errors.email} success={success.email}>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" {...bind('email')} {...NO_AUTO_FIX}
                  inputMode="email" placeholder="your@email.com"
                  autoComplete="email"
                  style={inputStyle(!!errors.email)}
                />
                {checking.email && <CheckingTag />}
              </div>
            </Field>

            <Field id="signup-password" label="비밀번호" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.password ? 'text' : 'password'} {...bind('password')} {...NO_AUTO_FIX}
                  placeholder="최소 8자 이상"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                />
                <EyeToggle shown={showPw.password} onClick={() => toggleShowPw('password')} />
              </div>
            </Field>

            <Field id="signup-confirmPassword" label="비밀번호 확인" error={errors.confirmPassword}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.confirmPassword ? 'text' : 'password'} {...bind('confirmPassword')} {...NO_AUTO_FIX}
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirmPassword), paddingRight: 44 }}
                />
                <EyeToggle shown={showPw.confirmPassword} onClick={() => toggleShowPw('confirmPassword')} />
              </div>
            </Field>

            <Field id="signup-profileName" label="포트폴리오 주소" error={errors.profileName} success={success.profileName}
              hint={PROFILE_NAME_HINT}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" {...bind('profileName')} {...NO_AUTO_FIX}
                  placeholder="my-portfolio" maxLength={30}
                  autoComplete="off"
                  style={inputStyle(!!errors.profileName)}
                />
                {checking.profileName && <CheckingTag />}
              </div>
            </Field>

            <Field id="signup-tel" label="전화번호 (선택)" error={errors.tel}>
              <input
                type="tel" {...bind('tel')} placeholder="010-0000-0000"
                autoComplete="tel" inputMode="numeric" maxLength={13}
                style={inputStyle(!!errors.tel)}
              />
            </Field>

            <Field id="signup-instagramId" label="인스타그램 ID (선택)" error={errors.instagramId}>
              <input
                type="text" {...bind('instagramId')} {...NO_AUTO_FIX}
                placeholder="instagram_id" maxLength={31}
                autoComplete="off"
                style={inputStyle(!!errors.instagramId)}
              />
            </Field>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              marginBottom: 18, cursor: 'pointer',
            }}>
              <input
                id="signup-termsAgreed" type="checkbox" name="termsAgreed"
                checked={form.termsAgreed}
                aria-invalid={errors.termsAgreed ? true : undefined}
                aria-describedby="signup-termsAgreed-msg"
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
              <div id="signup-termsAgreed-msg" role="alert" style={{ color: COLORS.danger, fontSize: 11, marginTop: -12, marginBottom: 14 }}>
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

function Field({ id, label, error, success, hint, children }) {
  const msgId = `${id}-msg`;
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{
        display: 'block', color: COLORS.textSecondary,
        fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em',
      }}>{label}</label>
      {children}
      {error ? (
        <div id={msgId} role="alert" style={{ color: COLORS.danger, fontSize: 11, marginTop: 4 }}>⚠ {error}</div>
      ) : success ? (
        <div id={msgId} aria-live="polite" style={{ color: COLORS.successText, fontSize: 11, marginTop: 4 }}>✓ {success}</div>
      ) : hint ? (
        <div id={msgId} style={{ color: COLORS.textHint, fontSize: 11, marginTop: 4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

function CheckingTag() {
  return (
    <span aria-live="polite" style={{
      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
      fontSize: 11, color: COLORS.textHint,
    }}>확인 중...</span>
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
