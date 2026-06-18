import React, { useState } from 'react';

function RelatedCard({ photo, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(photo.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden',
        cursor: 'pointer', position: 'relative', background: '#111',
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered ? 'linear-gradient(transparent 40%, rgba(0,0,0,0.7) 100%)' : 'transparent',
        transition: 'background 0.25s ease',
      }} />
      {photo.title && hovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '8px', fontSize: 12, color: '#fff', fontWeight: 600,
          lineHeight: 1.3,
        }}>
          {photo.title}
        </div>
      )}
    </div>
  );
}

export default function RelatedPhotos({ photos = [], onPhotoClick }) {
  if (photos.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>
        관련 사진
      </div>
      <style>{`
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (max-width: 480px) { .related-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
      <div className="related-grid">
        {photos.slice(0, 6).map(p => (
          <RelatedCard key={p.id} photo={p} onClick={onPhotoClick} />
        ))}
      </div>
    </div>
  );
}
