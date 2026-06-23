import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRE_META, COLORS } from '../../constants/colors';

export default function GenreBadge({ genre, size = 'md', onClick }) {
  const navigate = useNavigate();
  if (!genre || !GENRE_META[genre]) return null;
  const { emoji, label, color } = GENRE_META[genre];
  const bg = color + '20';
  const sm = size === 'sm';
  const handleClick = () => {
    if (onClick) { onClick(genre); return; }
    navigate(`/explore?genre=${genre}`);
  };
  return (
    <span
      onClick={handleClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sm ? 3 : 4,
        padding: sm ? '2px 7px' : '3px 10px',
        borderRadius: 12,
        background: bg,
        color,
        fontSize: sm ? 11 : 12,
        fontWeight: 600,
        border: `1px solid ${color}30`,
        letterSpacing: '0.01em',
        cursor: 'pointer',
      }}>
      <span style={{ fontSize: sm ? 10 : 12 }}>{emoji}</span>
      {label}
    </span>
  );
}

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
