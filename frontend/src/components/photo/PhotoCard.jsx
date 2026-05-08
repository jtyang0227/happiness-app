import React from 'react';
import { MOOD_COLORS } from '../../constants/colors';

export default function PhotoCard({ photo, onClick, showDetails = true }) {
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const imgSrc = photo.imageUrl || photo.image;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: '#1a1a2e',
        width: '100%',
        display: 'block',
        overflow: 'hidden',
      }}
    >
      <img
        src={imgSrc}
        alt={photo.title}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />

      {mood && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          background: mood.bg, borderRadius: 12, padding: '3px 8px',
          fontSize: 11, fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block', flexShrink: 0 }} />
          {mood.label}
        </div>
      )}

      {showDetails && photo.title && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          padding: '24px 10px 10px',
          color: '#fff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{photo.title}</div>
          {photo.likeCount != null && (
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>💗 {photo.likeCount}</div>
          )}
        </div>
      )}
    </div>
  );
}
