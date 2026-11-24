import React, { useEffect, useState } from 'react';
import { photoApi } from '../../services/api';
import { COLORS } from '../../constants/colors';

/**
 * 비슷한 사진 (PLANNING_inside-menus-upgrade.md P0-A, Cosmos "비슷한 요소" 재해석).
 * 장르·색 분위기·대표색이 비슷한 다른 작가의 사진으로 이어서 둘러보게 한다. 결과가 없으면 섹션째 숨긴다.
 * theme: 'dark'(사진 모달) | 'light'(사진 상세). onSelect(photo)로 고른 사진을 넘긴다.
 */
export default function SimilarPhotos({ photoId, theme = 'light', columns = 4, onSelect }) {
  const [photos, setPhotos] = useState(null);   // null = 불러오는 중
  const dark = theme === 'dark';

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    photoApi.getSimilar(photoId)
      .then(res => { if (alive) setPhotos(res?.data ?? []); })
      .catch(() => { if (alive) setPhotos([]); });   // 부가 섹션이라 실패하면 조용히 숨긴다
    return () => { alive = false; };
  }, [photoId]);

  if (photos && photos.length === 0) return null;

  return (
    <section aria-label="비슷한 사진">
      <style>{`
        .similar-cell { position: relative; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; border: none; padding: 0; cursor: pointer; }
        .similar-cell::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 0.15s ease; }
        .similar-cell:hover::after { background: rgba(0,0,0,0.12); }
        .similar-cell:active { transform: scale(0.97); }
        .similar-cell:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .similar-cell .similar-author { opacity: 0; transition: opacity 0.15s ease; }
        .similar-cell:hover .similar-author, .similar-cell:focus-visible .similar-author { opacity: 1; }
        @media (hover: none) { .similar-cell .similar-author { opacity: 1; } }
        @media (max-width: 600px) { .similar-grid { grid-template-columns: repeat(3, 1fr) !important; } }
      `}</style>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: dark ? COLORS.darkText : COLORS.text }}>비슷한 사진</h3>
      <p style={{ margin: '2px 0 10px', fontSize: 12, color: dark ? COLORS.darkTextSub : COLORS.textMuted }}>
        장르·색감이 비슷한 다른 작가의 사진
      </p>
      <div className="similar-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6 }}>
        {photos === null
          ? Array.from({ length: columns * 2 }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '1 / 1', borderRadius: 8, background: dark ? COLORS.darkElevated : COLORS.border,
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            ))
          : photos.map(p => (
              <button key={p.id} type="button" className="similar-cell" onClick={() => onSelect?.(p)}
                aria-label={`${p.title || '사진'}${p.memberName ? ` — ${p.memberName}` : ''}`}
                style={{ background: dark ? COLORS.darkElevated : COLORS.border }}>
                <img src={p.thumbnailUrl || p.imageUrl} alt="" loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                {p.memberName && (
                  <span className="similar-author" style={{
                    position: 'absolute', left: 4, right: 4, bottom: 4, zIndex: 1, padding: '2px 6px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'left',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.memberName}</span>
                )}
              </button>
            ))}
      </div>
    </section>
  );
}
