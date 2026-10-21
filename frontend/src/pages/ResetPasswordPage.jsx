import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { FormField, Input } from '../components/common/Input';
import { validateField } from '../utils/signupValidation';

/**
 * 비밀번호 재설정 — 메일 링크(`/reset-password?token=`)로 들어온다. 공개, 헤더 없는 단독 화면.
 * 열 때 토큰을 먼저 확인해 만료·사용됨을 알려 주고, 유효하면 새 비밀번호를 받는다.
 * 기획: DESIGN_PROMPTS/planning/PLANNING_account-recovery.md
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [state, setState] = useState('checking');   // checking | ready | invalid | done
  const [maskedEmail, setMaskedEmail] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    let alive = true;
    authApi.verifyResetToken(token)
      .then(res => { if (!alive) return; setMaskedEmail(res?.data?.maskedEmail || ''); setState('ready'); })
      .catch(() => { if (alive) setState('invalid'); });
    return () => { alive = false; };
  }, [token]);

  const change = (name, value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    setErrors(p => {
      const e = { ...p, [name]: touched[name] ? validateField(name, next) : '' };
      if (name === 'password' && touched.confirmPassword) e.confirmPassword = validateField('confirmPassword', next);
      return e;
    });
  };
  const blur = (name) => {
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validateField(name, form) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = { password: validateField('password', form), confirmPassword: validateField('confirmPassword', form) };
    setTouched({ password: true, confirmPassword: true });
    setErrors(errs);
    if (errs.password || errs.confirmPassword) {
      document.getElementById(errs.password ? 'reset-password' : 'reset-confirm')?.focus();
      return;
    }
    setLoading(true); setApiErr('');
    try {
      await authApi.confirmPasswordReset(token, form.password);
      setState('done');
    } catch (err) {
      const status = err.response?.status;
      // 400 = 링크가 그 사이 만료·사용됨 → 다시 요청 화면으로
      if (status === 400 && /링크/.test(err.response?.data?.message || '')) setState('invalid');
      else setApiErr(err.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', background: COLORS.bg,
    }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/login" aria-label="로그인으로" style={{ display: 'inline-flex', marginBottom: 12 }}>
            <Logo variant="black" size={40} />
          </Link>
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>비밀번호 재설정</div>
        </div>

        <div aria-live="polite" style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 20, padding: '24px',
        }}>
          {state === 'checking' && (
            <div aria-label="링크 확인 중">
              {[60, 90, 40].map((w, i) => (
                <div key={i} style={{
                  height: i === 1 ? 40 : 14, width: `${w}%`, borderRadius: 8, marginBottom: 14,
                  background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite',
                }} />
              ))}
            </div>
          )}

          {state === 'invalid' && (
            <div style={{ textAlign: 'center' }}>
              <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 10 }}>⏱</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
                링크가 만료되었거나 이미 사용되었어요
              </div>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6, margin: '0 0 18px' }}>
                재설정 링크는 30분 동안 한 번만 쓸 수 있어요. 새 링크를 받아 주세요.
              </p>
              <Button fullWidth size="lg" onClick={() => navigate('/find-account?tab=password')}>다시 요청하기</Button>
            </div>
          )}

          {state === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 10, color: COLORS.successText }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>비밀번호를 바꿨어요</div>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6, margin: '0 0 18px' }}>
                보안을 위해 다른 기기에서는 로그아웃됐어요. 새 비밀번호로 로그인해 주세요.
              </p>
              <Button fullWidth size="lg" onClick={() => navigate('/login')}>로그인하기</Button>
            </div>
          )}

          {state === 'ready' && (
            <form onSubmit={submit} noValidate>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
                새 비밀번호 정하기
              </h2>
              {maskedEmail && (
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 18px', overflowWrap: 'anywhere' }}>{maskedEmail}</p>
              )}
              {apiErr && (
                <div role="alert" style={{
                  background: COLORS.dangerTonal, borderRadius: 12, padding: '11px 14px',
                  color: COLORS.danger, fontSize: 13, marginBottom: 14,
                }}>{apiErr}</div>
              )}
              <FormField id="reset-password" label="새 비밀번호" error={errors.password} helperText="8자 이상">
                <div style={{ position: 'relative' }}>
                  <Input
                    id="reset-password" type={show ? 'text' : 'password'} value={form.password} error={errors.password}
                    helperText="8자 이상" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    style={{ width: '100%', paddingRight: 44 }}
                    onChange={e => change('password', e.target.value)} onBlur={() => blur('password')}
                  />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? '비밀번호 숨기기' : '비밀번호 보이기'}
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16,
                    }}>{show ? '🙈' : '👁'}</button>
                </div>
              </FormField>
              <FormField id="reset-confirm" label="새 비밀번호 확인" error={errors.confirmPassword}>
                <Input
                  id="reset-confirm" type={show ? 'text' : 'password'} value={form.confirmPassword} error={errors.confirmPassword}
                  autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  style={{ width: '100%' }}
                  onChange={e => change('confirmPassword', e.target.value)} onBlur={() => blur('confirmPassword')}
                />
              </FormField>
              <Button type="submit" fullWidth size="lg" loading={loading}>비밀번호 바꾸기</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
