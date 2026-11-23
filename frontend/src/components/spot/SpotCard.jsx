import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';

/** 미리보기 1~3장 콜라주(왼쪽 큰 1장 + 오른쪽 2장, 2px 간격). 사진이 없으면 회색 자리 + 핀 */
export function SpotCollage({ photos = [], height = 180, radius = 14 }) {
  const box = { background: COLORS.bg, overflow: 'hidden' };
  const img = (src, alt) => (
    <img src={src} alt={alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  );
  if (photos.length === 0) {
    return (
      <div aria-hidden="true" style={{ ...box, height, borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: COLORS.textHint }}>
        📍
      </div>
    );
  }
  if (photos.length < 3) {
    return <div style={{ ...box, height, borderRadius: radius }}>{img(photos[0], '스팟 대표 사진')}</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height, borderRadius: radius, overflow: 'hidden' }}>
      <div style={{ ...box, gridRow: '1 / 3' }}>{img(photos[0], '스팟 대표 사진')}</div>
      <div style={box}>{img(photos[1], '')}</div>
      <div style={box}>{img(photos[2], '')}</div>
    </div>
  );
}

export function TimeChip({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999,
      background: COLORS.primaryLight, color: COLORS.primaryDark, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/** 스팟 목록 카드 — 카드 전체가 상세 링크 */
export default function SpotCard({ spot, style }) {
  return (
    <Link to={`/spots/${spot.id}`} className="spot-card" aria-label={`${spot.name} 스팟 보기`} style={{
      display: 'block', textDecoration: 'none', color: 'inherit', background: COLORS.surface,
      borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 8, ...style,
    }}>
      <SpotCollage photos={spot.previewPhotos} />
      <div style={{ padding: '10px 6px 6px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {spot.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
            {[spot.region, `사진 ${spot.photoCount ?? 0}장`].filter(Boolean).join(' · ')}
          </span>
          {spot.bestTime && <TimeChip>🌅 {spot.bestTime}</TimeChip>}
        </div>
      </div>
    </Link>
  );
}
