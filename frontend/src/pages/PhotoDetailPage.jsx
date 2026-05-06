import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { MOOD_COLORS, COLORS } from '../constants/colors';

export default function PhotoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const all = await photoApi.getAll();
        if (!cancelled) {
          const found = (Array.isArray(all) ? all : []).find(p => String(p.id) === String(id));
          if (found) {
            setPhoto(found);
          } else {
            setError('사진을 찾을 수 없습니다.');
          }
        }
      } catch {
        if (!cancelled) setError('사진을 불러오는데 실패했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await photoApi.remove(id);
      navigate('/');
    } catch {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: COLORS.textSecondary }}>불러오는 중...</div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <div style={{ color: COLORS.danger, fontSize: 16 }}>{error || '사진을 찾을 수 없습니다.'}</div>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          갤러리로 돌아가기
        </button>
      </div>
    );
  }

  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: COLORS.textSecondary,
          fontSize: 14,
          fontWeight: 600,
          padding: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← 뒤로가기
      </button>

      <div
        style={{
          background: COLORS.white,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img
            src={photo.imageUrl || photo.image}
            alt={photo.title}
            style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block' }}
          />
          {mood && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: mood.bg,
                padding: '5px 12px',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
              {mood.label}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, flex: 1 }}>
              {photo.title || '제목 없음'}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
              <button
                onClick={() => navigate(`/photo/${id}/edit`)}
                style={{
                  padding: '8px 16px',
                  background: '#f0f0f8',
                  color: COLORS.primary,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '8px 16px',
                  background: deleting ? '#f5f5f5' : '#fff0f0',
                  color: COLORS.danger,
                  border: 'none',
                  borderRadius: 8,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>

          {photo.description && (
            <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.7, marginBottom: 20 }}>
              {photo.description}
            </p>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            {/* Like button */}
            <button
              onClick={() => setLiked(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                border: `1.5px solid ${liked ? '#e53e3e' : COLORS.border}`,
                background: liked ? '#fff0f0' : COLORS.white,
                color: liked ? '#e53e3e' : COLORS.textSecondary,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
                transition: 'all 0.15s',
              }}
            >
              {liked ? '♥' : '♡'} 좋아요
              {photo.likeCount != null && (
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {photo.likeCount + (liked ? 1 : 0)}
                </span>
              )}
            </button>

            {photo.gridColSpan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 13 }}>
                <span>그리드:</span>
                <strong style={{ color: COLORS.textSecondary }}>{photo.gridColSpan}칸</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
