import React from 'react';
import { GENRE_LIST, COLORS } from '../../constants/colors';

/**
 * 장르 선택 컴포넌트
 * primary: 1개 필수, sub: 최대 2개 (primary 제외)
 *
 * Props:
 *   primary    {string|null}   — 선택된 primary 장르 코드
 *   subList    {string[]}      — 선택된 sub 장르 코드 배열
 *   onChange   ({primary, subGenres}) => void
 *   required   {boolean}
 */
export default function GenreSelector({ primary, subList = [], onChange, required = false }) {
  const handlePrimary = (code) => {
    const next = primary === code ? null : code;
    onChange({
      primary: next,
      subGenres: subList.filter(s => s !== next),
    });
  };

  const handleSub = (code) => {
    if (code === primary) return;
    let next;
    if (subList.includes(code)) {
      next = subList.filter(s => s !== code);
    } else if (subList.length >= 2) {
      next = [...subList.slice(1), code];
    } else {
      next = [...subList, code];
    }
    onChange({ primary, subGenres: next });
  };

  return (
    <div>
      <div style={{ marginBottom: 6, fontSize: 13, color: COLORS.textSecondary }}>
        <strong style={{ color: COLORS.text }}>주 장르</strong>
        {required && <span style={{ color: COLORS.danger }}> *</span>}
        <span style={{ marginLeft: 6, color: COLORS.textMuted }}>1개 선택</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {GENRE_LIST.map(({ code, emoji, label, color, bg }) => {
          const sel = primary === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handlePrimary(code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 20,
                border: `2px solid ${sel ? color : COLORS.border}`,
                background: sel ? bg : COLORS.surface,
                color: sel ? color : COLORS.textSecondary,
                fontWeight: sel ? 700 : 400,
                fontSize: 13, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              {sel && <span style={{ marginLeft: 2 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {primary && (
        <>
          <div style={{ marginBottom: 6, fontSize: 13, color: COLORS.textSecondary }}>
            <strong style={{ color: COLORS.text }}>서브 장르</strong>
            <span style={{ marginLeft: 6, color: COLORS.textMuted }}>최대 2개 (선택)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GENRE_LIST.filter(g => g.code !== primary).map(({ code, emoji, label, color, bg }) => {
              const sel = subList.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSub(code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 20,
                    border: `1.5px solid ${sel ? color : COLORS.border}`,
                    background: sel ? bg : COLORS.surface,
                    color: sel ? color : COLORS.textMuted,
                    fontWeight: sel ? 600 : 400,
                    fontSize: 12, cursor: 'pointer',
                    opacity: subList.length >= 2 && !sel ? 0.5 : 1,
                  }}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  {sel && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
