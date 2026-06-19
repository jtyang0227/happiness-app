import React, { useState } from 'react';

function MagazineCell({ photo, onClick, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(photo.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        overflow: 'hidden', cursor: 'pointer', position: 'relative',
        background: '#1a1a1a', ...style,
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.35s ease',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.75) 100%)',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.3s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '12px 10px',
      }}>
        {photo.title && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            {photo.title}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagazineGrid({ photos = [], onPhotoClick }) {
  if (!photos.length) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
      사진을 추가하면 포트폴리오가 완성됩니다.
    </div>
  );

  const gap = 3;
  const chunks = [];
  for (let i = 0; i < photos.length; ) {
    chunks.push({ type: 'A', photos: photos.slice(i, i + 4) });
    i += 4;
    if (i < photos.length) {
      chunks.push({ type: 'B', photos: photos.slice(i, i + 3) });
      i += 3;
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap }}>
      {chunks.map((chunk, ci) => {
        if (chunk.type === 'A' && chunk.photos.length >= 1) {
          const [p0, p1, p2, p3] = chunk.photos;
          // 짝수 블록: 큰 사진 왼쪽 / 홀수 블록: 큰 사진 오른쪽 (교대)
          const reverse = ci % 2 !== 0;
          return (
            <div key={ci}>
              <div style={{ display: 'grid', gridTemplateColumns: reverse ? '1fr 2fr' : '2fr 1fr', gap, height: 360 }}>
                {reverse ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap }}>
                      {[p1, p2].filter(Boolean).map((p, i) => p
                        ? <MagazineCell key={p.id} photo={p} onClick={onPhotoClick} style={{ height: '100%' }} />
                        : <div key={i} />
                      )}
                    </div>
                    {p0 && <MagazineCell photo={p0} onClick={onPhotoClick} style={{ height: '100%' }} />}
                  </>
                ) : (
                  <>
                    {p0 && <MagazineCell photo={p0} onClick={onPhotoClick} style={{ height: '100%' }} />}
                    <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap }}>
                      {[p1, p2].filter(Boolean).map((p, i) => p
                        ? <MagazineCell key={p.id} photo={p} onClick={onPhotoClick} style={{ height: '100%' }} />
                        : <div key={i} />
                      )}
                    </div>
                  </>
                )}
              </div>
              {p3 && (
                <div style={{ marginTop: gap }}>
                  <MagazineCell photo={p3} onClick={onPhotoClick} style={{ height: 160 }} />
                </div>
              )}
            </div>
          );
        }
        if (chunk.type === 'B' && chunk.photos.length >= 1) {
          return (
            <div key={ci} style={{ display: 'grid', gridTemplateColumns: `repeat(${chunk.photos.length}, 1fr)`, gap, height: 220 }}>
              {chunk.photos.map(p => (
                <MagazineCell key={p.id} photo={p} onClick={onPhotoClick} style={{ height: '100%' }} />
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
