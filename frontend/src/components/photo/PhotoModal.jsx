import React, { useState, useEffect } from 'react';
import { photoApi } from '../../services/api';
import { MOOD_COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

export default function PhotoModal({ photo: initial, onClose, onUpdated }) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState(initial);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await photoApi.like(photo.id);
      const updated = res?.data ?? { ...photo, likeCount: (photo.likeCount || 0) + 1 };
      setPhoto(updated);
      onUpdated?.(updated);
    } catch {
      setPhoto(p => ({ ...p, likeCount: (p.likeCount || 0) + 1 }));
    } finally {
      setLiking(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await photoApi.save(photo.id);
      const updated = res?.data ?? { ...photo, saveCount: (photo.saveCount || 0) + 1 };
      setPhoto(updated);
      onUpdated?.(updated);
    } catch {
      setPhoto(p => ({ ...p, saveCount: (p.saveCount || 0) + 1 }));
    } finally {
      setSaving(false);
    }
  };

  const handleComment = () => {
    const text = comment.trim();
    if (!text) return;
    setComments(prev => [...prev, {
      id: Date.now(),
      text,
      author: user?.name || '나',
      createdAt: new Date(),
    }]);
    setComment('');
  };

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
          background: '#16162a',
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
              label={`💗 좋아요 ${photo.likeCount || 0}`}
            />
            <ActionBtn
              onClick={handleSave}
              disabled={saving}
              color="#f59e0b"
              label={`⭐ 저장 ${photo.saveCount || 0}`}
            />
          </div>

          {/* 댓글 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 8px' }}>
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: 0.4 }}>
              댓글{comments.length > 0 ? ` (${comments.length})` : ''}
            </div>

            {comments.length === 0 && (
              <div style={{ color: '#374151', fontSize: 13, textAlign: 'center', paddingTop: 16 }}>
                첫 댓글을 남겨보세요 ✍️
              </div>
            )}

            {comments.map(c => (
              <div key={c.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#5b6ef5', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                  }}>
                    {c.author.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#d1d5db', fontSize: 12, fontWeight: 600 }}>{c.author}</span>
                  <span style={{ color: '#374151', fontSize: 11, marginLeft: 'auto' }}>{formatTime(c.createdAt)}</span>
                </div>
                <p style={{ color: '#e5e7eb', fontSize: 13, lineHeight: 1.55, margin: '0 0 0 36px' }}>
                  {c.text}
                </p>
              </div>
            ))}
          </div>

          {/* 댓글 입력 */}
          <div style={{ padding: '10px 20px 18px', borderTop: '1px solid #2a2a45', flexShrink: 0, display: 'flex', gap: 8 }}>
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder="댓글 달기..."
              style={{
                flex: 1, background: '#0f0f1e', border: '1px solid #2a2a45',
                borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={handleComment}
              style={{
                background: '#5b6ef5', color: '#fff', border: 'none',
                borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                flexShrink: 0,
              }}
            >전송</button>
          </div>
        </div>
      </div>
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

function formatTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(date).toLocaleDateString('ko-KR');
}
