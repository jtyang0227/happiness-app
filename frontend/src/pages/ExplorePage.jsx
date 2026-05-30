import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';

const MOODS = Object.entries(MOOD_COLORS).map(([key, val]) => ({ key, label: val.label, dot: val.dot }));

function ExploreCard({ photo, onLike }) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.likeCount ?? 0);
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const imgSrc = photo.imageUrl || photo.image;
  const authorName = photo.memberName || photo.member?.name || '익명';
  const navigate = useNavigate();

  const handleLike = (e) => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    onLike?.(photo.id, next);
  };

  return (
    <div
      onClick={() => navigate(`/photo/${photo.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 8px 28px rgba(0,0,0,0.13)'
          : '0 2px 12px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.22s, box-shadow 0.22s',
        cursor: 'pointer',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#111' }}>
        <img
          src={imgSrc}
          alt={photo.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* Mood badge */}
        {mood && (
          <div style={{
            position: 'absolute', top: 9, right: 9,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: 20, padding: '3px 9px',
            fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
            {mood.label}
          </div>
        )}
        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {photo.tags.slice(0, 3).map(tag => (
              <span key={tag.id ?? tag} style={{
                background: 'rgba(0,0,0,0.55)',
                color: '#fff', fontSize: 10, fontWeight: 600,
                padding: '2px 7px', borderRadius: 10,
              }}>
                #{tag.name ?? tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px 14px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 5, lineHeight: 1.4 }}>
          {photo.title || '제목 없음'}
        </h3>
        {photo.description && (
          <p style={{
            fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5,
            marginBottom: 10, display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {photo.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.primary}, #a78bfa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              {authorName.charAt(0)}
            </div>
            <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 500 }}>
              {authorName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleLike}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                color: liked ? COLORS.danger : COLORS.textMuted,
                fontSize: 12, fontWeight: 600, padding: 0,
                transition: 'color 0.15s',
              }}
            >
              {liked ? '♥' : '♡'} {likeCount}
            </button>
            {photo.saveCount != null && (
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                ★ {photo.saveCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { photos, loading, error, refetch } = usePhotos();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState('');

  const filtered = useMemo(() => {
    return photos.filter(photo => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        photo.title?.toLowerCase().includes(q) ||
        photo.description?.toLowerCase().includes(q) ||
        photo.memberName?.toLowerCase().includes(q) ||
        photo.tags?.some(t => (t.name ?? t).toLowerCase().includes(q));
      const matchMood = !selectedMood || photo.colorMood === selectedMood;
      return matchSearch && matchMood;
    });
  }, [photos, search, selectedMood]);

  const handleLike = (id, isLike) => {
    if (!user?.id) return;
    if (isLike) photoApi.likePhoto(id, user.id).catch(() => {});
    else photoApi.unlikePhoto(id, user.id).catch(() => {});
  };

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${COLORS.border}`,
          borderTopColor: COLORS.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 14 }}>
        <div style={{ color: COLORS.danger, fontSize: 15 }}>{error}</div>
        <button onClick={refetch} style={primaryBtn}>다시 시도</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>탐색</h1>
        <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          {photos.length}장의 사진을 둘러보세요
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제목, 태그, 작가 검색..."
          style={{
            width: '100%', padding: '11px 16px',
            borderRadius: 12, border: `1.5px solid ${COLORS.border}`,
            background: COLORS.surface, fontSize: 14, color: COLORS.text,
            outline: 'none', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      {/* Mood filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          onClick={() => setSelectedMood('')}
          style={chipStyle(selectedMood === '')}
        >
          전체
        </button>
        {MOODS.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMood(prev => prev === m.key ? '' : m.key)}
            style={chipStyle(selectedMood === m.key)}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0', fontSize: 15 }}>
          {photos.length === 0 ? '아직 등록된 사진이 없습니다.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(photo => (
            <ExploreCard key={photo.id} photo={photo} onLike={handleLike} />
          ))}
        </div>
      )}
    </div>
  );
}

const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '70vh',
};

const primaryBtn = {
  padding: '8px 18px', background: COLORS.primary, color: '#fff',
  border: 'none', borderRadius: 10, cursor: 'pointer',
  fontWeight: 700, fontSize: 13,
};

const chipStyle = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 12px', borderRadius: 20,
  border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
  background: active ? COLORS.primaryLight : COLORS.surface,
  color: active ? COLORS.primary : COLORS.textSecondary,
  fontSize: 12, fontWeight: active ? 700 : 500,
  cursor: 'pointer', transition: 'all 0.15s',
});
