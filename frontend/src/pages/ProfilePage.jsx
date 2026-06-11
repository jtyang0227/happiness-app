import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { photoApi, authApi, seriesApi } from '../services/api';
import { uploadImage } from '../services/uploadApi';
import { COLORS } from '../constants/colors';

const TABS = [
  { key: 'photos',   label: '내 작품' },
  { key: 'saved',    label: '저장함' },
  { key: 'series',   label: '시리즈' },
  { key: 'settings', label: '설정' },
];

const SPECIALTIES_OPTIONS = [
  '웨딩', '인물/포트레이트', '풍경', '제품/광고', '음식',
  '건축/인테리어', '스포츠/액션', '야생동물', '패션', '이벤트',
];

function PhotoGrid({ photos, onPhotoClick }) {
  if (!photos || photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted, fontSize: 14 }}>
        사진이 없습니다.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {photos.map(photo => (
        <div
          key={photo.id}
          onClick={() => onPhotoClick(photo.id)}
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
  );
}

function SeriesList({ series, onSeriesClick }) {
  if (!series || series.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted, fontSize: 14 }}>
        시리즈가 없습니다.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {series.map(s => (
        <div
          key={s.id}
          onClick={() => onSeriesClick(s.id)}
          style={{
            borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
            border: `1px solid ${COLORS.border}`, background: COLORS.surface,
          }}
        >
          <div style={{ aspectRatio: '16/9', background: COLORS.bg, position: 'relative', overflow: 'hidden' }}>
            {s.coverUrl ? (
              <img src={s.coverUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                🎞
              </div>
            )}
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{s.title}</div>
            {s.description && (
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('photos');
  const [stats, setStats] = useState(null);
  const [myPhotos, setMyPhotos] = useState([]);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [seriesList, setSeriesList] = useState([]);

  const [toast, setToast] = useState('');
  const [loadingTab, setLoadingTab] = useState(false);
  const [coverHover, setCoverHover] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    tel: user?.tel || '',
    profileName: user?.profileName || '',
    instagramId: user?.instagramId || '',
    websiteUrl: user?.websiteUrl || '',
    location: user?.location || '',
    bio: user?.bio || '',
    specialties: user?.specialties ? user.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingForm, setSavingForm] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const isKakao = user?.provider === 'kakao';
  const avatarLetter = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  // Load stats once
  useEffect(() => {
    if (!user?.id) return;
    authApi.getStats(user.id).then(setStats).catch(() => {});
  }, [user?.id]);

  // Load tab data on switch
  useEffect(() => {
    if (!user?.id) return;
    setLoadingTab(true);
    if (activeTab === 'photos') {
      photoApi.getByMember(user.id)
        .then(setMyPhotos)
        .catch(() => {})
        .finally(() => setLoadingTab(false));
    } else if (activeTab === 'saved') {
      photoApi.getSaved(user.id)
        .then(setSavedPhotos)
        .catch(() => {})
        .finally(() => setLoadingTab(false));
    } else if (activeTab === 'series') {
      seriesApi.getByMember(user.id)
        .then(setSeriesList)
        .catch(() => {})
        .finally(() => setLoadingTab(false));
    } else {
      setLoadingTab(false);
    }
  }, [activeTab, user?.id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, 'avatars');
      await updateProfile({ avatarUrl: result.url });
      showToast('프로필 사진이 업데이트되었습니다.');
    } catch {
      showToast('이미지 업로드에 실패했습니다.');
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, 'covers');
      await updateProfile({ coverUrl: result.url });
      showToast('커버 사진이 업데이트되었습니다.');
    } catch {
      showToast('이미지 업로드에 실패했습니다.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setFormErrors(p => ({ ...p, [name]: '' }));
  };

  const toggleSpecialty = (s) => {
    setForm(p => ({
      ...p,
      specialties: p.specialties.includes(s)
        ? p.specialties.filter(x => x !== s)
        : [...p.specialties, s],
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.';
    if (form.profileName && !/^[a-z0-9-]+$/.test(form.profileName))
      errs.profileName = '영문 소문자, 숫자, 하이픈만 사용 가능합니다.';
    if (form.websiteUrl && !/^https?:\/\//.test(form.websiteUrl))
      errs.websiteUrl = 'http:// 또는 https://로 시작해야 합니다.';
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSavingForm(true);
    try {
      await updateProfile({
        name: form.name,
        tel: form.tel,
        profileName: form.profileName,
        instagramId: form.instagramId,
        websiteUrl: form.websiteUrl,
        location: form.location,
        bio: form.bio,
        specialties: form.specialties.join(', '),
      });
      showToast('프로필이 저장되었습니다.');
    } catch (err) {
      showToast(err.message || '저장에 실패했습니다.');
    } finally {
      setSavingForm(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.current) errs.current = '현재 비밀번호를 입력해주세요.';
    if (pwForm.next.length < 8) errs.next = '비밀번호는 8자 이상이어야 합니다.';
    if (pwForm.next !== pwForm.confirm) errs.confirm = '비밀번호가 일치하지 않습니다.';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword(user.id, { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current: '', next: '', confirm: '' });
      showToast('비밀번호가 변경되었습니다.');
    } catch (err) {
      showToast(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setSavingPw(false);
    }
  };

  const statItems = [
    { label: '사진',   value: stats?.photoCount      ?? myPhotos.length },
    { label: '좋아요', value: stats?.totalLikes       ?? 0 },
    { label: '저장됨', value: stats?.totalSaves       ?? 0 },
    { label: '공유',   value: stats?.totalShares      ?? 0 },
    { label: '문의',   value: stats?.inquiryCount     ?? 0 },
    { label: '미읽음', value: stats?.unreadInquiryCount ?? 0 },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80 }}>

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

      {/* Cover */}
      <div
        style={{ position: 'relative', height: 180, cursor: 'pointer', overflow: 'hidden' }}
        onMouseEnter={() => setCoverHover(true)}
        onMouseLeave={() => setCoverHover(false)}
        onClick={() => coverInputRef.current?.click()}
      >
        {user?.coverUrl ? (
          <img src={user.coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 60%, #c084fc 100%)`,
          }} />
        )}
        {coverHover && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 600, gap: 6,
          }}>
            <span>📷</span> 커버 사진 변경
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
      </div>

      {/* Avatar */}
      <div style={{ position: 'relative', marginTop: -42, marginLeft: 24, marginBottom: 0, display: 'inline-block' }}>
        <div
          style={{
            width: 84, height: 84, borderRadius: '50%',
            background: user?.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#fff',
            border: '4px solid #fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            overflow: 'hidden', cursor: 'pointer', position: 'relative',
          }}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          onClick={() => avatarInputRef.current?.click()}
        >
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : avatarLetter}
          {avatarHover && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              ✏️
            </div>
          )}
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </div>

      {/* User info */}
      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{user?.name || '-'}</div>
        {user?.profileName && (
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>@{user.profileName}</div>
        )}
        {user?.bio && (
          <div style={{ fontSize: 13, color: COLORS.text, marginTop: 6, lineHeight: 1.5 }}>{user.bio}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {user?.location && <span style={tagStyle}>📍 {user.location}</span>}
          {user?.websiteUrl && (
            <a href={user.websiteUrl} target="_blank" rel="noreferrer" style={{ ...tagStyle, color: COLORS.primary, textDecoration: 'none' }}>
              🔗 웹사이트
            </a>
          )}
          {user?.instagramId && (
            <span style={tagStyle}>📷 @{user.instagramId}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', margin: '16px 0 0',
        borderTop: `1px solid ${COLORS.border}`,
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
      }}>
        {statItems.map(({ label, value }, i) => (
          <div key={label} style={{
            flex: 1, textAlign: 'center', padding: '12px 0',
            borderRight: i < statItems.length - 1 ? `1px solid ${COLORS.border}` : 'none',
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>{value}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 56, zIndex: 10,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '14px 0', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? COLORS.primary : COLORS.textSecondary,
              borderBottom: activeTab === t.key ? `2px solid ${COLORS.primary}` : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 0' }}>
        {loadingTab ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>불러오는 중...</div>
        ) : (
          <>
            {activeTab === 'photos' && (
              <PhotoGrid photos={myPhotos} onPhotoClick={(id) => navigate(`/photo/${id}`)} />
            )}
            {activeTab === 'saved' && (
              <PhotoGrid photos={savedPhotos} onPhotoClick={(id) => navigate(`/photo/${id}`)} />
            )}
            {activeTab === 'series' && (
              <div style={{ padding: '0 16px' }}>
                <SeriesList series={seriesList} onSeriesClick={(id) => navigate(`/series`)} />
              </div>
            )}
            {activeTab === 'settings' && (
              <div style={{ padding: '0 20px' }}>

                {/* Profile form */}
                <div style={sectionCard}>
                  <div style={sectionTitle}>기본 정보</div>
                  <form onSubmit={handleSave} noValidate>
                    {[
                      { label: '이름 *',           name: 'name',        placeholder: '홍길동' },
                      { label: '전화번호',          name: 'tel',         placeholder: '010-0000-0000', type: 'tel' },
                      { label: '포트폴리오 주소',   name: 'profileName', placeholder: 'my-portfolio (영문 소문자·숫자·하이픈)' },
                      { label: '인스타그램 ID',     name: 'instagramId', placeholder: 'instagram_id (@ 제외)' },
                      { label: '웹사이트',          name: 'websiteUrl',  placeholder: 'https://example.com' },
                      { label: '활동 지역',         name: 'location',    placeholder: '서울 / 부산 / 제주 등' },
                    ].map(({ label, name, placeholder, type = 'text' }) => (
                      <div key={name} style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>{label}</label>
                        <input
                          type={type} name={name} value={form[name]}
                          onChange={handleFormChange} placeholder={placeholder}
                          style={{
                            ...inputStyle,
                            border: `1.5px solid ${formErrors[name] ? COLORS.danger : COLORS.border}`,
                          }}
                        />
                        {formErrors[name] && (
                          <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 3 }}>{formErrors[name]}</div>
                        )}
                      </div>
                    ))}

                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>자기소개</label>
                      <textarea
                        name="bio" value={form.bio} onChange={handleFormChange}
                        placeholder="작가 소개, 촬영 스타일, 연락 방법 등을 작성해주세요."
                        rows={4}
                        style={{
                          ...inputStyle,
                          resize: 'vertical', lineHeight: 1.6,
                          border: `1.5px solid ${COLORS.border}`,
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={labelStyle}>전문 분야</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {SPECIALTIES_OPTIONS.map(s => (
                          <button
                            key={s} type="button" onClick={() => toggleSpecialty(s)}
                            style={{
                              padding: '6px 14px', borderRadius: 20, fontSize: 13,
                              border: `1.5px solid ${form.specialties.includes(s) ? COLORS.primary : COLORS.border}`,
                              background: form.specialties.includes(s) ? COLORS.primaryLight : COLORS.surface,
                              color: form.specialties.includes(s) ? COLORS.primary : COLORS.textSecondary,
                              cursor: 'pointer', fontWeight: form.specialties.includes(s) ? 700 : 400,
                              transition: 'all 0.15s',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={savingForm} style={primaryBtn(savingForm)}>
                      {savingForm ? '저장 중...' : '프로필 저장'}
                    </button>
                  </form>
                </div>

                {/* Password change — hidden for kakao users */}
                {!isKakao && (
                  <div style={sectionCard}>
                    <div style={sectionTitle}>비밀번호 변경</div>
                    <form onSubmit={handlePasswordChange} noValidate>
                      {[
                        { label: '현재 비밀번호', key: 'current', placeholder: '현재 비밀번호 입력' },
                        { label: '새 비밀번호',   key: 'next',    placeholder: '8자 이상' },
                        { label: '비밀번호 확인', key: 'confirm', placeholder: '새 비밀번호 재입력' },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key} style={{ marginBottom: 14 }}>
                          <label style={labelStyle}>{label}</label>
                          <input
                            type="password" value={pwForm[key]}
                            onChange={e => { setPwForm(p => ({ ...p, [key]: e.target.value })); setPwErrors(p => ({ ...p, [key]: '' })); }}
                            placeholder={placeholder}
                            style={{
                              ...inputStyle,
                              border: `1.5px solid ${pwErrors[key] ? COLORS.danger : COLORS.border}`,
                            }}
                          />
                          {pwErrors[key] && (
                            <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 3 }}>{pwErrors[key]}</div>
                          )}
                        </div>
                      ))}
                      <button type="submit" disabled={savingPw} style={primaryBtn(savingPw)}>
                        {savingPw ? '변경 중...' : '비밀번호 변경'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Logout */}
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: COLORS.danger, fontSize: 13, fontWeight: 600,
                      padding: '8px 16px', borderRadius: 8,
                    }}
                  >
                    로그아웃
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const tagStyle = {
  fontSize: 12, color: COLORS.textSecondary,
  background: COLORS.bg, borderRadius: 20,
  padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 3,
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: COLORS.textSecondary, marginBottom: 5,
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 11,
  background: COLORS.bg, color: COLORS.text, fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const sectionCard = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: '20px',
  marginBottom: 16,
};

const sectionTitle = {
  fontSize: 14, fontWeight: 800, color: COLORS.text, marginBottom: 16,
};

const primaryBtn = (disabled) => ({
  width: '100%', padding: '13px', borderRadius: 11, border: 'none',
  background: disabled ? COLORS.textMuted : COLORS.primary,
  color: '#fff', fontSize: 14, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 2px 12px rgba(91,110,245,0.3)',
});
