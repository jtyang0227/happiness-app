import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import { photoApi } from '../../services/api';
import { deliveryApi } from '../../services/deliveryApi';
import { useAuth } from '../../contexts/AuthContext';

const EXPIRY_OPTIONS = [
  { label: '30일', days: 30 },
  { label: '60일', days: 60 },
  { label: '90일', days: 90 },
];

export default function DeliveryCreateModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(new Set());
  const [expiryDays, setExpiryDays] = useState(30);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    photoApi.getByMember(user.id)
      .then(data => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const togglePhoto = (id) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (selectedPhotoIds.size === 0) { setError('사진을 1장 이상 선택해주세요.'); return; }
    if (usePassword && password.length < 4) {
      setPasswordError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setError('');
    setPasswordError('');
    setSubmitting(true);
    try {
      const result = await deliveryApi.create({
        title: title.trim(),
        clientName: clientName.trim(),
        photoIds: Array.from(selectedPhotoIds),
        expiryDays,
        password: usePassword ? password : null,
      });
      const token = result?.token || result?.data?.token || '';
      const url = `${window.location.origin}/proof/${token}`;
      setCreatedUrl(url);
      onCreated?.();
    } catch (err) {
      setError('납품 세트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = createdUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (createdUrl) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, margin: '0 0 8px' }}>납품 링크 생성 완료!</h2>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 }}>아래 링크를 고객에게 공유하세요.</p>
          <div style={{ background: COLORS.bg, borderRadius: 10, padding: '12px 14px', marginBottom: 16, wordBreak: 'break-all', fontSize: 12, color: COLORS.text, textAlign: 'left', border: `1px solid ${COLORS.border}` }}>
            {createdUrl}
          </div>
          <button onClick={handleCopy} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: copied ? COLORS.success : COLORS.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12, transition: 'background 0.2s' }}>
            {copied ? '✓ 복사됨' : '🔗 링크 복사'}
          </button>
          <button onClick={onClose} style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 16px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, margin: 0 }}>새 납품 세트</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: COLORS.textMuted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 6 }}>제목 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="납품 세트 제목" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, color: COLORS.text, background: COLORS.surface, outline: 'none' }} />
          </div>

          {/* Client name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 6 }}>고객 이름</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="고객 이름 (선택)" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, color: COLORS.text, background: COLORS.surface, outline: 'none' }} />
          </div>

          {/* Photo grid */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 6 }}>
              사진 선택 {selectedPhotoIds.size > 0 && <span style={{ color: COLORS.primary }}>({selectedPhotoIds.size}장 선택됨)</span>}
            </label>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted, fontSize: 13 }}>사진 불러오는 중...</div>
            ) : photos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted, fontSize: 13 }}>업로드된 사진이 없습니다.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {photos.map(p => (
                  <div
                    key={p.id}
                    onClick={() => togglePhoto(p.id)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `2.5px solid ${selectedPhotoIds.has(p.id) ? COLORS.primary : 'transparent'}`,
                      position: 'relative',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <img src={p.thumbnailUrl || p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {selectedPhotoIds.has(p.id) && (
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 8 }}>만료 기간</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setExpiryDays(opt.days)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    border: `1.5px solid ${expiryDays === opt.days ? COLORS.primary : COLORS.border}`,
                    background: expiryDays === opt.days ? COLORS.primaryLight : COLORS.surface,
                    color: expiryDays === opt.days ? COLORS.primary : COLORS.text,
                    fontSize: 13, fontWeight: expiryDays === opt.days ? 700 : 400, cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Password toggle */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: usePassword ? 10 : 0 }}>
              <button
                onClick={() => { setUsePassword(v => !v); setPassword(''); setPasswordError(''); }}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: usePassword ? COLORS.primary : COLORS.border,
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{ position: 'absolute', top: 2, left: usePassword ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>비밀번호 설정</span>
            </div>
            {usePassword && (
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="비밀번호 (4자 이상)"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${passwordError ? COLORS.danger : COLORS.border}`, fontSize: 14, color: COLORS.text, background: COLORS.surface, outline: 'none' }}
                />
                {passwordError && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{passwordError}</div>}
              </div>
            )}
          </div>

          {error && <div style={{ fontSize: 13, color: COLORS.danger, marginBottom: 12 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
            <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '13px 0', borderRadius: 12, border: 'none', background: submitting ? COLORS.border : COLORS.primary, color: submitting ? COLORS.textMuted : '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {submitting ? '생성 중...' : '납품 링크 생성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
