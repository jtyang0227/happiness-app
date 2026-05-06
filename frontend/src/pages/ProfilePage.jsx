import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

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
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
    setSuccess('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.';
    if (form.profileName && !/^[a-z0-9-]+$/.test(form.profileName)) {
      errs.profileName = '영문 소문자, 숫자, 하이픈만 사용 가능합니다.';
    }
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    setSuccess('');
    try {
      await updateProfile(form);
      setSuccess('프로필이 성공적으로 수정되었습니다.');
      setEditing(false);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
    background: COLORS.white,
    color: COLORS.text,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  });

  const avatarLetter = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 24 }}>프로필</h1>

      {/* Avatar + basic info */}
      <div
        style={{
          background: COLORS.white,
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.primary}, #a78bfa)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{user?.name || '-'}</div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{user?.email || '-'}</div>
            {user?.profileName && (
              <div style={{ fontSize: 12, color: COLORS.primary, marginTop: 3, fontWeight: 600 }}>
                @{user.profileName}
              </div>
            )}
          </div>
        </div>

        {success && (
          <div
            style={{
              background: '#f0fff4',
              border: '1px solid #c6f6d5',
              borderRadius: 8,
              padding: '10px 14px',
              color: COLORS.success,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        {apiError && (
          <div
            style={{
              background: '#fff0f0',
              border: '1px solid #ffcccc',
              borderRadius: 8,
              padding: '10px 14px',
              color: COLORS.danger,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {apiError}
          </div>
        )}

        {!editing ? (
          /* View mode */
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { label: '이름', value: user?.name },
                { label: '전화번호', value: user?.tel },
                { label: '포트폴리오 주소', value: user?.profileName ? `@${user.profileName}` : null },
                { label: '인스타그램', value: user?.instagramId ? `@${user.instagramId}` : null },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, width: 120, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 14, color: value ? COLORS.text : COLORS.textMuted, fontWeight: value ? 500 : 400 }}>
                    {value || '미설정'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setEditing(true); setSuccess(''); setApiError(''); }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                border: `1.5px solid ${COLORS.primary}`,
                background: '#eef0ff',
                color: COLORS.primary,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              프로필 수정
            </button>
          </div>
        ) : (
          /* Edit mode */
          <form onSubmit={handleSave} noValidate>
            {[
              { label: '이름', name: 'name', placeholder: '홍길동' },
              { label: '전화번호', name: 'tel', placeholder: '010-0000-0000', type: 'tel' },
              { label: '포트폴리오 주소', name: 'profileName', placeholder: 'my-portfolio' },
              { label: '인스타그램 ID', name: 'instagramId', placeholder: 'instagram_id' },
            ].map(({ label, name, placeholder, type = 'text' }) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 5 }}>
                  {label}
                </label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  style={inputStyle(!!errors[name])}
                />
                {errors[name] && (
                  <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 3 }}>{errors[name]}</div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  setApiError('');
                  setForm({
                    name: user?.name || '',
                    tel: user?.tel || '',
                    profileName: user?.profileName || '',
                    instagramId: user?.instagramId || '',
                  });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: `1.5px solid ${COLORS.border}`,
                  background: '#fff',
                  color: COLORS.textSecondary,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: loading ? '#a0a8e8' : COLORS.primary,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logout */}
      <div
        style={{
          background: COLORS.white,
          borderRadius: 16,
          padding: '20px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            border: `1.5px solid #ffcccc`,
            background: '#fff0f0',
            color: COLORS.danger,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ffe0e0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
