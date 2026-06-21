import React from 'react';
import { GENRE_META, COLORS } from '../../constants/colors';

/**
 * 단일 장르 뱃지
 * Props:
 *   genre  {string}   — 장르 코드 (예: 'PORTRAIT')
 *   size   {'sm'|'md'} — 기본 'md'
 */
export default function GenreBadge({ genre, size = 'md' }) {
  if (!genre || !GENRE_META[genre]) return null;
  const { emoji, label, color, bg } = GENRE_META[genre];
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sm ? 3 : 4,
      padding: sm ? '2px 7px' : '3px 10px',
      borderRadius: 12,
      background: bg,
      color,
      fontSize: sm ? 11 : 12,
      fontWeight: 600,
      border: `1px solid ${color}30`,
      letterSpacing: '0.01em',
    }}>
      <span style={{ fontSize: sm ? 10 : 12 }}>{emoji}</span>
      {label}
    </span>
  );
}

/** 서브장르 뱃지 목록 (JSON 문자열 파싱) */
export function SubGenreBadges({ subGenres, size = 'sm' }) {
  if (!subGenres) return null;
  let codes;
  try { codes = JSON.parse(subGenres); } catch { return null; }
  if (!Array.isArray(codes) || codes.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {codes.map(code => (
        <GenreBadge key={code} genre={code} size={size} />
      ))}
    </span>
  );
}
