import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { FormField, Input } from '../components/common/Input';
import { EMAIL_RE, formatPhone, validateField } from '../utils/signupValidation';

/**
 * 계정 찾기 — 아이디(이메일) 찾기 · 비밀번호 재설정 메일 요청. 공개, 헤더 없는 단독 화면.
 * 기획: DESIGN_PROMPTS/planning/PLANNING_account-recovery.md
 */
const TABS = [
  { key: 'email', label: '아이디 찾기' },
  { key: 'password', label: '비밀번호 찾기' },
];
const PROVIDER_LABEL = { local: '이메일', kakao: '카카오', google: 'Google', naver: '네이버', apple: 'Apple' };

export default function FindAccountPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'password' ? 'password' : 'email';
  const setTab = (key) => setParams(key === 'email' ? {} : { tab: key }, { replace: true });

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
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>계정 찾기</div>
        </div>

        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 20, padding: '20px 24px 24px',
        }}>
          <div role="tablist" aria-label="찾을 항목" style={{
            display: 'flex', gap: 4, padding: 4, borderRadius: 12,
            background: COLORS.bg, marginBottom: 22,
          }}>
            {TABS.map(t => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key} type="button" role="tab" aria-selected={active}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, height: 40, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: active ? COLORS.surface : 'transparent',
                    color: active ? COLORS.text : COLORS.textMuted,
                    fontSize: 14, fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >{t.label}</button>
              );
            })}
          </div>

          {tab === 'email' ? <FindEmail onGoPassword={() => setTab('password')} /> : <ResetRequest />}
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
          <Link to="/login" style={{ color: COLORS.primary, fontWeight: 700 }}>로그인</Link>
          <span aria-hidden="true" style={{ margin: '0 8px' }}>·</span>
          <Link to="/signup" style={{ color: COLORS.textSecondary }}>회원가입</Link>
        </div>
      </div>
    </div>
  );
}

/* ── 아이디 찾기 ─────────────────────────────────────── */

function FindEmail({ onGoPassword }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [accounts, setAccounts] = useState(null);   // null = 아직 안 찾음

  const check = (field, value) => {
    if (field === 'name') return value.trim() ? '' : '이름을 입력해주세요.';
    if (!value) return '휴대폰 번호를 입력해주세요.';
    return validateField('tel', { tel: value });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = { name: check('name', name), tel: check('tel', tel) };
    setErrors(errs);
    if (errs.name || errs.tel) {
      document.getElementById(errs.name ? 'find-name' : 'find-tel')?.focus();
      return;
    }
    setLoading(true); setApiErr('');
    try {
      const res = await authApi.findEmail(name.trim(), tel);
      setAccounts(res?.data?.accounts || []);
    } catch (err) {
      setApiErr(err.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (accounts) {
    return (
      <div aria-live="polite">
        {accounts.length ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
              가입된 계정을 찾았어요
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {accounts.map((a, i) => (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 12, background: COLORS.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 16, fontWeight: 700, color: COLORS.text,
                      fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
                    }}>{a.maskedEmail}</div>
                    {a.joinedAt && (
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{a.joinedAt} 가입</div>
                    )}
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
                    background: COLORS.primaryLight, color: COLORS.primary,
                  }}>{PROVIDER_LABEL[a.provider] || a.provider} 가입</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button fullWidth size="lg" onClick={() => navigate('/login')}>로그인하러 가기</Button>
              <Button fullWidth size="lg" variant="secondary" onClick={onGoPassword}>비밀번호 찾기</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
              일치하는 계정이 없어요
            </div>
            <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6, margin: '0 0 18px' }}>
              이름과 휴대폰 번호를 다시 확인해 주세요. 가입할 때 휴대폰 번호를 넣지 않았다면 찾을 수 없어요 —
              쓰셨을 만한 이메일로 비밀번호 찾기를 해 보세요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button fullWidth size="lg" onClick={() => setAccounts(null)}>다시 찾기</Button>
              <Button fullWidth size="lg" variant="secondary" onClick={onGoPassword}>비밀번호 찾기</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6, margin: '0 0 16px' }}>
        가입할 때 넣은 이름과 휴대폰 번호로 가입 이메일을 찾아요.
      </p>
      {apiErr && <ErrorBanner text={apiErr} />}
      <FormField id="find-name" label="이름" error={errors.name}>
        <Input
          id="find-name" value={name} error={errors.name} placeholder="홍길동" autoComplete="name"
          onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: check('name', e.target.value) })); }}
          onBlur={() => setErrors(p => ({ ...p, name: check('name', name) }))}
        />
      </FormField>
      <FormField id="find-tel" label="휴대폰 번호" error={errors.tel}>
        <Input
          id="find-tel" type="tel" value={tel} error={errors.tel} placeholder="010-0000-0000"
          autoComplete="tel" inputMode="numeric" maxLength={13}
          onChange={e => { const v = formatPhone(e.target.value); setTel(v); if (errors.tel) setErrors(p => ({ ...p, tel: check('tel', v) })); }}
          onBlur={() => setErrors(p => ({ ...p, tel: check('tel', tel) }))}
        />
      </FormField>
      <Button type="submit" fullWidth size="lg" loading={loading}>아이디 찾기</Button>
    </form>
  );
}

/* ── 비밀번호 재설정 메일 요청 ───────────────────────── */

function ResetRequest() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [sentTo, setSentTo] = useState('');

  const check = (v) => {
    if (!v.trim()) return '이메일을 입력해주세요.';
    return EMAIL_RE.test(v.trim()) ? '' : '올바른 이메일 형식이 아닙니다. (예: user@example.com)';
  };

  const send = async (e) => {
    e?.preventDefault();
    const value = email.trim();
    setEmail(value);
    const msg = check(value);
    setError(msg);
    if (msg) { document.getElementById('reset-email')?.focus(); return; }
    setLoading(true); setApiErr('');
    try {
      await authApi.requestPasswordReset(value.toLowerCase());
      setSentTo(value);
    } catch (err) {
      setApiErr(err.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <div aria-live="polite" style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 10 }}>✉️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>메일을 확인해 주세요</div>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7, margin: '0 0 18px' }}>
          <b style={{ color: COLORS.text, overflowWrap: 'anywhere' }}>{sentTo}</b>이(가) 가입된 이메일이면
          30분 동안 쓸 수 있는 재설정 링크를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
        {apiErr && <ErrorBanner text={apiErr} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button fullWidth size="lg" variant="secondary" loading={loading} onClick={() => send()}>다시 보내기</Button>
          <Button fullWidth size="lg" variant="ghost" onClick={() => setSentTo('')}>다른 이메일 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6, margin: '0 0 16px' }}>
        가입한 이메일을 입력하면 새 비밀번호를 정할 수 있는 링크를 보내 드려요.
      </p>
      {apiErr && <ErrorBanner text={apiErr} />}
      <FormField id="reset-email" label="이메일" error={error}>
        <Input
          id="reset-email" type="email" value={email} error={error} placeholder="your@email.com"
          autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={e => { setEmail(e.target.value); if (error) setError(check(e.target.value)); }}
          onBlur={() => { const v = email.trim(); setEmail(v); setError(check(v)); }}
        />
      </FormField>
      <Button type="submit" fullWidth size="lg" loading={loading}>재설정 메일 받기</Button>
    </form>
  );
}

function ErrorBanner({ text }) {
  return (
    <div role="alert" style={{
      background: COLORS.dangerTonal, borderRadius: 12, padding: '11px 14px',
      color: COLORS.danger, fontSize: 13, marginBottom: 14, lineHeight: 1.5,
    }}>{text}</div>
  );
}
