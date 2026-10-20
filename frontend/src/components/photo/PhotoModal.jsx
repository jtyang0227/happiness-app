import React, { useState, useEffect } from 'react';
import { photoApi } from '../../services/api';
import { MOOD_COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import CommentsSection from './CommentsSection';
import ReportModal from './ReportModal';
import { trackView } from '../../utils/trackView';

export default function PhotoModal({ photo: initial, onClose, onUpdated }) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState(initial);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // 모달로 연 것도 사진 조회로 센다 (작가 본인 제외)
  useEffect(() => {
    trackView({ ownerId: initial?.memberId, viewerId: user?.id, eventType: 'PHOTO_VIEW', targetType: 'PHOTO', targetId: initial?.id });
  }, [initial?.id, initial?.memberId, user?.id]);

  // 예전 구현은 존재하지 않는 photoApi.like/save를 호출해 항상 예외 → catch에서 화면 숫자만 올려
  // 실제로는 아무것도 저장되지 않았다. 실제 API(likePhoto/savePhoto)로 호출하고 실패는 사용자에게 알린다.
  const runAction = async (key, call, countField, busy, setBusy) => {
    if (busy) return;
    if (!user?.id) { alert('로그인 후 이용할 수 있어요.'); return; }
    setBusy(true);
    try {
      await call(photo.id, user.id);
      const updated = { ...photo, [countField]: (photo[countField] || 0) + 1 };
      setPhoto(updated);
      onUpdated?.(updated);
    } catch (e) {
      alert(e?.response?.data?.message || `${key}에 실패했어요. 잠시 후 다시 시도해주세요.`);
    } finally {
      setBusy(false);
    }
  };
  const handleLike = () => runAction('좋아요', photoApi.likePhoto, 'likesCount', liking, setLiking);
  const handleSave = () => runAction('저장', photoApi.savePhoto, 'savesCount', saving, setSaving);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1A1E22',
          borderRadius: 16,
          display: 'flex',
          width: '100%',
          maxWidth: 1060,
          maxHeight: '92vh',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(0,0,0,0.55)', border: 'none',
            color: '#fff', width: 34, height: 34, borderRadius: '50%',
            cursor: 'pointer', fontSize: 17,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* 좌: 이미지 */}
        <div style={{
          flex: 3,
          background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 360,
          overflow: 'hidden',
        }}>
          <img
            src={photo.imageUrl || photo.image}
            alt={photo.title}
            style={{ maxWidth: '100%', maxHeight: '92vh', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* 우: 정보 패널 */}
        <div style={{
          width: 320, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid #2a2a45',
          overflow: 'hidden',
        }}>
          {/* 제목/설명 */}
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #2a2a45', flexShrink: 0 }}>
            {mood && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: mood.dot }}>{mood.label}</span>
              </div>
            )}
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.4 }}>
              {photo.title}
            </h2>
            {photo.description && (
              <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, margin: '10px 0 0' }}>
                {photo.description}
              </p>
            )}
            {photo.createdAt && (
              <p style={{ color: '#4b5563', fontSize: 11, margin: '8px 0 0' }}>
                {new Date(photo.createdAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>

          {/* 좋아요 / 저장 */}
          <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderBottom: '1px solid #2a2a45', flexShrink: 0 }}>
            <ActionBtn
              onClick={handleLike}
              disabled={liking}
              color="#e86d8a"
              label={`💗 좋아요 ${photo.likesCount || 0}`}
            />
            <ActionBtn
              onClick={handleSave}
              disabled={saving}
              color="#f59e0b"
              label={`⭐ 저장 ${photo.savesCount || 0}`}
            />
          </div>

          {/* 댓글 섹션 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 18px' }}>
            <CommentsSection photoId={photo.id} currentUser={user} theme="dark" />

            {reportSubmitted ? (
              <div style={{ marginTop: 16, fontSize: 12, color: '#34d399' }}>
                ✓ 신고가 접수되었습니다.
              </div>
            ) : user?.id && photo.memberId !== user.id && (
              <button
                onClick={() => setReportOpen(true)}
                style={{
                  marginTop: 16, background: 'none', border: 'none',
                  color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: 0,
                }}
              >🚨 이 사진 신고하기</button>
            )}
          </div>
        </div>
      </div>

      {reportOpen && (
        <ReportModal
          photoId={photo.id}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => setReportSubmitted(true)}
        />
      )}
    </div>
  );
}

function ActionBtn({ onClick, disabled, color, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '9px 4px',
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}44`,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 13,
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
    >{label}</button>
  );
}

