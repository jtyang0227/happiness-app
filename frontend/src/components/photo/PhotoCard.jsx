import React, { useState } from 'react';
import { MOOD_COLORS } from '../../constants/colors';

export default function PhotoCard({ photo, onClick, showDetails = true }) {
  const [hovered, setHovered] = useState(false);
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const imgSrc = photo.imageUrl || photo.image;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: '#111',
        width: '100%',
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      <img
        src={imgSrc}
        alt={photo.title}
        style={{
          width: '100%', height: 'auto', display: 'block',
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: mood.dot, display: 'inline-block', flexShrink: 0,
          }} />
          {mood.label}
        </div>
      )}

      {/* Title overlay — shows on hover */}
      {showDetails && photo.title && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          padding: '32px 12px 12px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
            {photo.title}
          </div>
          {photo.likeCount != null && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
              ♥ {photo.likeCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
