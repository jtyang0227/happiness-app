import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOOD_COLORS, COLORS } from '../../constants/colors';

export default function PhotoCard({ photo, showDetails = true }) {
  const navigate = useNavigate();
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <div
      onClick={() => navigate(`/photo/${photo.id}`)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 0,
        background: '#1a1a2e',
        aspectRatio: '1 / 1',
        width: '100%',
      }}
    >
      {/* Image */}
      <img
        src={photo.imageUrl || photo.image}
        alt={photo.title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />

      {/* Mood badge — top right */}
      {mood && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: mood.bg,
            borderRadius: 12,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: mood.dot,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {mood.label}
        </div>
      )}

      {/* Bottom gradient overlay */}
      {showDetails && photo.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
            padding: '20px 10px 10px',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, noWrap: true }}>
            {photo.title}
          </div>
          {photo.likeCount != null && (
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
              {'♥'} {photo.likeCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
