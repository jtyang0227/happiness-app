import { useNavigate } from 'react-router-dom';
import { GENRE_META } from '../../constants/colors';

export default function GenreBadge({ genre, subGenres = [], onClick, size = 'md' }) {
  const navigate = useNavigate();
  const meta = GENRE_META[genre];
  if (!meta) return null;

  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? 11 : 13;

  const handleClick = (g) => {
    if (onClick) { onClick(g); return; }
    navigate(`/explore?genre=${g}`);
  };

  const badgeStyle = (g, isMain) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding, fontSize, borderRadius: 20, cursor: 'pointer',
    fontWeight: isMain ? 600 : 400,
    background: isMain ? GENRE_META[g]?.color + '20' : 'transparent',
    color: GENRE_META[g]?.color || '#5c5c7a',
    border: `1px solid ${GENRE_META[g]?.color || '#e2e2ee'}`,
    transition: 'opacity 0.15s',
    userSelect: 'none',
  });

  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={badgeStyle(genre, true)} onClick={() => handleClick(genre)}>
        {meta.emoji} {meta.label}
      </span>
      {subGenres.filter(g => g && GENRE_META[g]).map(g => (
        <span key={g} style={badgeStyle(g, false)} onClick={() => handleClick(g)}>
          {GENRE_META[g].emoji} {GENRE_META[g].label}
        </span>
      ))}
    </span>
  );
}
