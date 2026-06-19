import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

const SIZES = [
  { label: '600 × 400', key: 'small',  width: '600',  height: '400' },
  { label: '800 × 500', key: 'medium', width: '800',  height: '500' },
  { label: '전체화면',   key: 'large',  width: '100%', height: '600' },
];

export default function EmbedCodeModal({ isOpen, onClose, profileName, baseUrl = 'https://app.example.com' }) {
  const [sizeKey, setSizeKey]   = useState('medium');
  const [copied,  setCopied]    = useState(false);

  if (!isOpen) return null;

  const sz   = SIZES.find(s => s.key === sizeKey);
  const code = `<iframe src="${baseUrl}/portfolio/${profileName}/slideshow"\n  width="${sz.width}" height="${sz.height}" frameborder="0"\n  title="${profileName} 포트폴리오"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480, width: '90vw', borderRadius: 16,
          background: COLORS.darkSurface, border: `1px solid ${COLORS.darkBorder}`, padding: 24,
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.darkText }}>임베드 코드</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.darkTextHint, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* 크기 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {SIZES.map(s => (
            <button key={s.key} onClick={() => setSizeKey(s.key)} style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 600,
              border: `1px solid ${sizeKey === s.key ? COLORS.primary : COLORS.darkBorder}`,
              background: sizeKey === s.key ? COLORS.primary : 'transparent',
              color: sizeKey === s.key ? '#fff' : COLORS.darkTextSub, cursor: 'pointer',
            }}>{s.label}</button>
          ))}
        </div>

        {/* 코드 박스 */}
        <pre style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12,
          fontFamily: 'monospace', fontSize: 12, color: '#a0d0ff',
          overflowX: 'auto', whiteSpace: 'pre-wrap', marginBottom: 14,
          border: `1px solid ${COLORS.darkBorder}`,
        }}>{code}</pre>

        {/* 복사 버튼 */}
        <button
          onClick={handleCopy}
          style={{
            width: '100%', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', background: copied ? '#2ea44f' : COLORS.primary,
            color: '#fff', cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          {copied ? '✓ 복사됨' : '📋 코드 복사'}
        </button>

        {/* 안내 */}
        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.darkTextHint, textAlign: 'center' }}>
          삽입할 페이지에 위 코드를 붙여 넣으세요.
        </div>
      </div>
    </div>
  );
}
