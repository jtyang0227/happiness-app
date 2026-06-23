import React from 'react';
import { GENRE_LIST } from '../../constants/colors';

export default function GenreTabBar({ selected, onChange, showAll = true, counts, genres, theme = 'light' }) {
  const filteredList = genres ? GENRE_LIST.filter(g => genres.includes(g.code)) : GENRE_LIST;
  const tabs = showAll
    ? [{ code: '', emoji: '✦', label: '전체' }, ...filteredList]
    : filteredList;

  const isDark = theme === 'dark';
  const unselectedBg = isDark ? 'rgba(255,255,255,0.1)' : '#ededf4';
  const unselectedColor = isDark ? 'rgba(255,255,255,0.55)' : '#5c5c7a';
  const fadeGradient = isDark
    ? 'linear-gradient(to left, #090909, transparent)'
    : 'linear-gradient(to left, #f5f5fa, transparent)';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        padding: '4px 2px 8px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {tabs.map(tab => {
          const isSelected = selected === tab.code;
          return (
            <button
              key={tab.code}
              onClick={() => onChange(tab.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 24, cursor: 'pointer',
                whiteSpace: 'nowrap', fontSize: 13, fontWeight: isSelected ? 600 : 400,
                border: 'none',
                background: isSelected ? '#5b6ef5' : unselectedBg,
                color: isSelected ? '#fff' : unselectedColor,
                boxShadow: isSelected ? '0 2px 8px rgba(91,110,245,0.3)' : 'none',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
              {counts && counts[tab.code] != null && (
                <span style={{
                  fontSize: 11, background: isSelected ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.15)' : '#d0d0e8'),
                  color: isSelected ? '#fff' : unselectedColor,
                  borderRadius: 10, padding: '1px 6px', marginLeft: 2,
                }}>
                  {counts[tab.code]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* 우측 페이드 힌트 */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
        background: fadeGradient,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
