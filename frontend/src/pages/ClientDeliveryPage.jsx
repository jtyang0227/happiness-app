import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { deliveryApi } from '../services/deliveryApi';
import DeliveryPasswordGate from '../components/delivery/DeliveryPasswordGate';
import DeliveryApproveModal from '../components/delivery/DeliveryApproveModal';

export default function ClientDeliveryPage() {
  const { token } = useParams();
  // Security: never store token in localStorage or logs
  const [delivery, setDelivery] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | password | ok | expired | error
  const [pwError, setPwError] = useState(false);
  const [likedIds, setLikedIds] = useState(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState('');
  const viewedRef = useRef(false);

  const loadDelivery = async (password = undefined) => {
    try {
      const data = await deliveryApi.getDetail(token, password);
      setDelivery(data);
      setStatus('ok');
      setPwError(false);

      // Mark viewed once
      if (!viewedRef.current) {
        viewedRef.current = true;
        deliveryApi.markViewed(token).catch(() => {});
      }
    } catch (err) {
      const code = err?.response?.status;
      if (code === 410) {
        setStatus('expired');
      } else if (code === 401 || code === 403) {
        setStatus('password');
        if (password !== undefined) setPwError(true);
      } else {
        setStatus('error');
        setError(err?.response?.data?.message || '납품 세트를 불러오는데 실패했습니다.');
      }
    }
  };

  useEffect(() => {
    if (token) loadDelivery();
  }, [token]);

  const toggleLike = (id) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadAll = () => {
    if (!delivery?.photos) return;
    delivery.photos.forEach((photo, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = photo.imageUrl || photo.url;
        a.download = photo.fileName || `photo-${i + 1}.jpg`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
  };

  const handleApprove = async (feedback) => {
    await deliveryApi.approve(token, {
      likedPhotoIds: Array.from(likedIds),
      feedback,
    });
    setApproved(true);
    setShowApproveModal(false);
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.primary, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: COLORS.bg, padding: 24 }}>
        <div style={{ fontSize: 48 }}>⏰</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, margin: 0 }}>납품 링크가 만료되었습니다</h2>
        <p style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', margin: 0 }}>
          링크 유효 기간이 지났습니다. 작가에게 새 링크를 요청해주세요.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: COLORS.bg, padding: 24 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, margin: 0 }}>오류가 발생했습니다</h2>
        <p style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (status === 'password') {
    return (
      <DeliveryPasswordGate
        clientName={delivery?.clientName}
        onSubmit={(pw) => loadDelivery(pw)}
        error={pwError}
      />
    );
  }

  if (approved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: COLORS.bg, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: 0 }}>최종 승인 완료!</h2>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.7 }}>
          소중한 피드백을 작가에게 전달했습니다.<br />감사합니다.
        </p>
      </div>
    );
  }

  const photos = delivery?.photos || [];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 100 }}>
      {/* Intro banner */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '24px 20px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {delivery?.artistAvatarUrl && (
            <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${COLORS.border}` }}>
              <img src={delivery.artistAvatarUrl} alt="작가" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>
              {delivery?.artistName || '작가'}의 납품 사진
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, margin: '0 0 2px' }}>
              {delivery?.title || '납품 사진 확인'}
            </h1>
            <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
              총 <strong>{photos.length}장</strong>의 사진을 납품드립니다.
            </div>
          </div>
        </div>
      </div>

      {/* Photo grid */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 12px' }}>
        {photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: COLORS.textMuted, fontSize: 14 }}>
            사진이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {photos.map(photo => {
              const isLiked = likedIds.has(photo.id);
              return (
                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#111' }}>
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl || photo.url}
                    alt={photo.title || '사진'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={() => toggleLike(photo.id)}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 32, height: 32, borderRadius: '50%',
                      border: 'none',
                      background: isLiked ? COLORS.danger : 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    aria-label={isLiked ? '좋아요 취소' : '좋아요'}
                  >
                    {isLiked ? '♥' : '♡'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {photos.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          padding: '12px 16px',
          display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ flex: 1, fontSize: 13, color: COLORS.textSecondary }}>
            {likedIds.size > 0 && <span>❤️ {likedIds.size}장 선택됨</span>}
          </div>
          <button
            onClick={handleDownloadAll}
            style={{ padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ↓ 전체 다운로드
          </button>
          <button
            onClick={() => setShowApproveModal(true)}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ✓ 최종 승인하기
          </button>
        </div>
      )}

      {showApproveModal && (
        <DeliveryApproveModal
          selectedCount={likedIds.size}
          onCancel={() => setShowApproveModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
