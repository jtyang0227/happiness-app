import React from 'react';
import { GENRE_LIST } from '../../constants/colors';

export default function GenreTabBar({ selected, onChange, showAll = true, counts, genres, theme = 'light' }) {
  const filteredList = genres ? GENRE_LIST.filter(g => genres.includes(g.code)) : GENRE_LIST;
  const tabs = showAll
    ? [{ code: '', emoji: '✦', label: '전체' }, ...filteredList]
    : filteredList;

  const isDark = theme === 'dark';

  if (isDark) {
    // Cosmos 언더라인 스타일 (다크 테마)
    return (
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', overflowX: 'auto',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {tabs.map(tab => {
            const isSelected = selected === tab.code;
            return (
              <button
                key={tab.code}
                onClick={() => onChange(tab.code)}
                style={{
                  position: 'relative',
                  padding: '10px 0',
                  marginRight: 28,
                  background: 'none',
                  border: 'none',
                  borderBottom: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  transition: 'color 0.15s, border-color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
              >
                {tab.label}
                {counts && counts[tab.code] != null && (
                  <span style={{
                    marginLeft: 5,
                    fontSize: 11,
                    color: isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  }}>
                    {counts[tab.code]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 라이트 테마 — 기존 pill 스타일 유지
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
                background: isSelected ? '#5b6ef5' : '#ededf4',
                color: isSelected ? '#fff' : '#5c5c7a',
                boxShadow: isSelected ? '0 2px 8px rgba(91,110,245,0.3)' : 'none',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
              {counts && counts[tab.code] != null && (
                <span style={{
                  fontSize: 11, background: isSelected ? 'rgba(255,255,255,0.25)' : '#d0d0e8',
                  color: isSelected ? '#fff' : '#5c5c7a',
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
        background: 'linear-gradient(to left, #f5f5fa, transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
