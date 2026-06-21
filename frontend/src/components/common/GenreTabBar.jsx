import React, { useRef } from 'react';
import { GENRE_META, COLORS } from '../../constants/colors';

/**
 * 장르 필터 탭바 (수평 스크롤)
 * Props:
 *   selected   {string|null}  — 현재 선택 장르 코드 (null = 전체)
 *   genres     {string[]}     — 표시할 장르 코드 목록 (없으면 전체 12종)
 *   onChange   (code|null) => void
 */
export default function GenreTabBar({ selected, genres, onChange }) {
  const scrollRef = useRef(null);
  const list = genres
    ? genres.map(code => ({ code, ...GENRE_META[code] })).filter(g => g.label)
    : Object.entries(GENRE_META).map(([code, meta]) => ({ code, ...meta }));

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        padding: '4px 0 8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <TabItem
        label="전체"
        emoji="📷"
        selected={selected === null}
        color={COLORS.primary}
        bg={COLORS.primaryLight}
        onClick={() => onChange(null)}
      />
      {list.map(({ code, emoji, label, color, bg }) => (
        <TabItem
          key={code}
          label={label}
          emoji={emoji}
          selected={selected === code}
          color={color}
          bg={bg}
          onClick={() => onChange(code)}
        />
      ))}
    </div>
  );
}

function TabItem({ label, emoji, selected, color, bg, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 20,
        border: `1.5px solid ${selected ? color : COLORS.border}`,
        background: selected ? bg : COLORS.surface,
        color: selected ? color : COLORS.textSecondary,
        fontWeight: selected ? 700 : 400,
        fontSize: 13, cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
