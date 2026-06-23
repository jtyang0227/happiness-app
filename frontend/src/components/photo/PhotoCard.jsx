import React, { useState } from 'react';
import { MOOD_COLORS } from '../../constants/colors';

export default function PhotoCard({ photo, onClick, showDetails = true }) {
  const [hovered, setHovered] = useState(false);
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const imgSrc = photo.imageUrl || photo.image;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${photo.title || '사진'} 보기`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: '#0f0f0f',
        width: '100%',
        overflow: 'hidden',
        borderRadius: 8,
        outline: 'none',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <style>{`
        [role="button"]:focus-visible {
          outline: 2px solid #5b6ef5 !important;
          outline-offset: 2px;
        }
      `}</style>

      <img
        src={imgSrc}
        alt={photo.title || '사진'}
        loading="lazy"
        style={{
          width: '100%', height: 'auto', display: 'block',
        }}
      />

      {/* Mood badge */}
      {mood && (
        <div
          aria-label={`분위기: ${mood.label}`}
          style={{
            position: 'absolute', top: 9, right: 9,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '3px 9px',
            fontSize: 11, fontWeight: 600, color: '#fff',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: mood.dot, display: 'inline-block', flexShrink: 0,
          }} />
          {mood.label}
        </div>
      )}

      {/* Author + save overlay — shows on hover */}
      {showDetails && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)',
          padding: '32px 12px 12px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <div style={{ minWidth: 0 }}>
            {photo.title && (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 2 }}>
                {photo.title}
              </div>
            )}
            {(photo.likeCount != null || photo.likesCount != null) && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                ♥ {photo.likeCount ?? photo.likesCount ?? 0}
              </div>
            )}
          </div>
          {/* Save button placeholder — visual only */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff',
          }}>
            🔖
          </div>
        </div>
      )}
    </div>
  );
}
