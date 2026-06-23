import React from 'react';
import { COLORS } from '../../constants/colors';

const SHOOT_TYPES = [
  { key: 'WEDDING',    emoji: '💍', label: '웨딩',    duration: '8시간' },
  { key: 'SNAP',       emoji: '📷', label: '스냅',    duration: '2시간' },
  { key: 'PROFILE',    emoji: '👤', label: '프로필',  duration: '1시간' },
  { key: 'MATERNITY',  emoji: '🌸', label: '만삭',    duration: '2시간' },
  { key: 'NEWBORN',    emoji: '👶', label: '신생아',  duration: '3시간' },
  { key: 'COMMERCIAL', emoji: '📦', label: '상업',    duration: '4시간' },
  { key: 'CUSTOM',     emoji: '✏️', label: '협의',    duration: '-' },
];

export default function ShootTypeSelector({ selected, onSelect }) {
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, margin: '0 0 20px', textAlign: 'center' }}>
        촬영 종류를 선택해주세요
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        <style>{`@media(max-width: 400px){ .shoot-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
        {SHOOT_TYPES.map(type => {
          const isSelected = selected === type.key;
          return (
            <div
              key={type.key}
              onClick={() => onSelect(type.key)}
              style={{
                borderRadius: 14,
                border: `2px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                background: isSelected ? COLORS.primaryLight : COLORS.surface,
                padding: '16px 10px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.background = '#f8f9ff';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.background = COLORS.surface;
                }
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{type.emoji}</div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: isSelected ? COLORS.primary : COLORS.text,
                marginBottom: 4,
              }}>
                {type.label}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                {type.duration}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
