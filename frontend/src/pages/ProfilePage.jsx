import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { photos } = usePhotos();
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
  const [toast, setToast] = useState('');

  const myPhotos = photos.filter(p => p.memberId === user?.id || p.member?.id === user?.id);
  const totalLikes = myPhotos.reduce((sum, p) => sum + (p.likeCount ?? 0), 0);
  const totalSaves = myPhotos.reduce((sum, p) => sum + (p.saveCount ?? 0), 0);
  const avatarLetter = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
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
      setToast('프로필이 저장되었습니다.');
      setEditing(false);
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(err.message || '저장에 실패했습니다.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false); setErrors({});
    setForm({
      name: user?.name || '', tel: user?.tel || '',
      profileName: user?.profileName || '', instagramId: user?.instagramId || '',
    });
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 60 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#222', color: '#fff', borderRadius: 12,
          padding: '10px 20px', fontSize: 13, fontWeight: 600,
          zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* Cover + Avatar */}
      <div style={{ position: 'relative', marginBottom: 0 }}>
        {/* Cover */}
        <div style={{
          height: 160,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 60%, #c084fc 100%)`,
        }} />

        {/* Avatar — overlapping cover */}
        <div style={{ position: 'absolute', bottom: -38, left: 24 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff',
            border: '4px solid #fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            {avatarLetter}
          </div>
        </div>
      </div>

      {/* Profile info card */}
      <div style={{
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '52px 24px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{user?.name || '-'}</div>
            {user?.profileName && (
              <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                @{user.profileName}
              </div>
            )}
            {user?.instagramId && (
              <div style={{ fontSize: 13, color: COLORS.primary, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: 0.7 }}>📷</span>
                @{user.instagramId}
              </div>
            )}
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{user?.email}</div>
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1.5px solid ${COLORS.border}`,
                background: COLORS.surface, color: COLORS.text,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              편집
            </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 0,
          marginTop: 20,
          borderTop: `1px solid ${COLORS.border}`,
          paddingTop: 16,
        }}>
          {[
            { label: '사진', value: myPhotos.length },
            { label: '좋아요', value: totalLikes },
            { label: '저장됨', value: totalSaves },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${COLORS.border}` : 'none',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{value}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '0 0 16px 16px',
          padding: '20px 24px 24px',
          marginBottom: 12,
        }}>
          <form onSubmit={handleSave} noValidate>
            {[
              { label: '이름 *',          name: 'name',        placeholder: '홍길동' },
              { label: '전화번호',         name: 'tel',         placeholder: '010-0000-0000', type: 'tel' },
              { label: '포트폴리오 주소', name: 'profileName', placeholder: 'my-portfolio (영문 소문자·숫자·하이픈)' },
              { label: '인스타그램 ID',   name: 'instagramId', placeholder: 'instagram_id (@ 제외)' },
            ].map(({ label, name, placeholder, type = 'text' }) => (
              <div key={name} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 5 }}>
                  {label}
                </label>
                <input
                  type={type} name={name} value={form[name]}
                  onChange={handleChange} placeholder={placeholder}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 11,
                    border: `1.5px solid ${errors[name] ? COLORS.danger : COLORS.border}`,
                    background: COLORS.bg, color: COLORS.text, fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {errors[name] && (
                  <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors[name]}</div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={cancelEdit} style={cancelBtn}>취소</button>
              <button type="submit" disabled={loading} style={saveBtn(loading)}>
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My photos grid */}
      {myPhotos.length > 0 && (
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 12 }}>
            내 사진 {myPhotos.length}장
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {myPhotos.slice(0, 9).map(photo => (
              <div
                key={photo.id}
                onClick={() => navigate(`/photo/${photo.id}`)}
                style={{ aspectRatio: '1', background: '#111', overflow: 'hidden', cursor: 'pointer' }}
              >
                <img
                  src={photo.imageUrl || photo.image}
                  alt={photo.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div style={{ padding: '32px 24px 0', textAlign: 'center' }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: COLORS.textMuted, fontSize: 13, fontWeight: 500,
            textDecoration: 'underline', padding: '4px 8px',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

const cancelBtn = {
  flex: 1, padding: '12px', borderRadius: 11,
  border: `1.5px solid ${COLORS.border}`,
  background: '#fff', color: COLORS.textSecondary,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
};

const saveBtn = (loading) => ({
  flex: 2, padding: '12px', borderRadius: 11, border: 'none',
  background: loading ? COLORS.textMuted : COLORS.primary,
  color: '#fff', fontSize: 14, fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  boxShadow: loading ? 'none' : '0 2px 12px rgba(91,110,245,0.3)',
});
