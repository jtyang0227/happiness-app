import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    tel: user?.tel || '',
    profileName: user?.profileName || '',
    instagramId: user?.instagramId || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
    setApiError(''); setSuccess('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.';
    if (form.profileName && !/^[a-z0-9-]+$/.test(form.profileName))
      errs.profileName = '영문 소문자, 숫자, 하이픈만 사용 가능합니다.';
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateProfile(form);
      setSuccess('프로필이 저장되었습니다.');
      setEditing(false);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const cancelEdit = () => {
    setEditing(false); setErrors({}); setApiError('');
    setForm({
      name: user?.name || '', tel: user?.tel || '',
      profileName: user?.profileName || '', instagramId: user?.instagramId || '',
    });
  };

  const avatarLetter = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const inputStyle = (hasError) => ({
    width: '100%', padding: '11px 14px',
    borderRadius: 11,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
    background: COLORS.bg,
    color: COLORS.text, fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Avatar row */}
      <div style={{
        background: COLORS.surface, borderRadius: 20,
        padding: '28px 28px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        border: `1px solid ${COLORS.border}`,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 16px rgba(91,110,245,0.3)',
          }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{user?.name || '-'}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{user?.email}</div>
            {user?.profileName && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 6, padding: '3px 10px', borderRadius: 20,
                background: COLORS.primaryLight,
                fontSize: 12, fontWeight: 600, color: COLORS.primary,
              }}>
                ✦ {user.profileName}.happiness.app
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <Alert type="success">{success}</Alert>
        )}
        {apiError && (
          <Alert type="danger">{apiError}</Alert>
        )}

        {!editing ? (
          /* View mode */
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {[
                { label: '이름', value: user?.name },
                { label: '전화번호', value: user?.tel },
                { label: '포트폴리오', value: user?.profileName ? `${user.profileName}.happiness.app` : null },
                { label: '인스타그램', value: user?.instagramId ? `@${user.instagramId}` : null },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : 'none',
                }}>
                  <span style={{ fontSize: 13, color: COLORS.textMuted, width: 96, flexShrink: 0 }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: value ? 500 : 400,
                    color: value ? COLORS.text : COLORS.textHint,
                  }}>
                    {value || '미설정'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setEditing(true); setSuccess(''); setApiError(''); }}
              style={{
                width: '100%', padding: '12px', borderRadius: 11,
                border: `1.5px solid ${COLORS.primary}`,
                background: COLORS.primaryLight,
                color: COLORS.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              프로필 수정
            </button>
          </>
        ) : (
          /* Edit mode */
          <form onSubmit={handleSave} noValidate>
            {[
              { label: '이름 *',          name: 'name',        placeholder: '홍길동' },
              { label: '전화번호',         name: 'tel',         placeholder: '010-0000-0000', type: 'tel' },
              { label: '포트폴리오 주소', name: 'profileName', placeholder: 'my-portfolio' },
              { label: '인스타그램 ID',   name: 'instagramId', placeholder: 'instagram_id' },
            ].map(({ label, name, placeholder, type = 'text' }) => (
              <div key={name} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 5 }}>
                  {label}
                </label>
                <input
                  type={type} name={name} value={form[name]}
                  onChange={handleChange} placeholder={placeholder}
                  style={inputStyle(!!errors[name])}
                />
                {errors[name] && (
                  <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors[name]}</div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button" onClick={cancelEdit}
                style={{
                  flex: 1, padding: '12px', borderRadius: 11,
                  border: `1.5px solid ${COLORS.border}`,
                  background: '#fff', color: COLORS.textSecondary,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="submit" disabled={loading}
                style={{
                  flex: 2, padding: '12px', borderRadius: 11, border: 'none',
                  background: loading ? COLORS.textHint : COLORS.primary,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 2px 12px rgba(91,110,245,0.3)',
                }}
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logout */}
      <div style={{
        background: COLORS.surface, borderRadius: 16, padding: '18px 28px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: `1px solid ${COLORS.border}`,
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '12px', borderRadius: 11,
            border: `1.5px solid #ffd0d0`,
            background: COLORS.dangerTonal, color: COLORS.danger,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ffe0e0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLORS.dangerTonal; }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

function Alert({ type, children }) {
  const isSuccess = type === 'success';
  return (
    <div style={{
      borderRadius: 10, padding: '10px 14px',
      background: isSuccess ? COLORS.successTonal : COLORS.dangerTonal,
      border: `1px solid ${isSuccess ? '#c6f6d5' : '#ffd0d0'}`,
      color: isSuccess ? COLORS.success : COLORS.danger,
      fontSize: 13, marginBottom: 16,
    }}>
      {children}
    </div>
  );
}
