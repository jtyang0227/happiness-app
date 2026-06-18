import React, { useState } from 'react';

const shimmer = {
  background: 'linear-gradient(90deg, #ededf4 25%, #f5f5fa 50%, #ededf4 75%)',
  backgroundSize: '200% 100%',
  animation: 'palette-shimmer 1.4s ease-in-out infinite',
};
const shimmerDark = {
  background: 'linear-gradient(90deg, #1a1a3a 25%, #22223e 50%, #1a1a3a 75%)',
  backgroundSize: '200% 100%',
  animation: 'palette-shimmer 1.4s ease-in-out infinite',
};

function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 128;
}

export default function ColorPalette({ colors = [], loading = false, theme = 'light', onColorCopy }) {
  const [copied, setCopied] = useState(null);
  const dark = theme === 'dark';

  const handleCopy = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      onColorCopy?.(hex);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  return (
    <div>
      <style>{`@keyframes palette-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: dark ? '#9090cc' : '#5c5c7a' }}>대표 색상</span>
        <span style={{ fontSize: 11, color: dark ? '#5555aa' : '#9090b0' }}>클릭하여 복사</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 44, borderRadius: 10, ...(dark ? shimmerDark : shimmer) }} />
          ))
        ) : colors.length === 0 ? (
          <div style={{ fontSize: 12, color: dark ? '#5555aa' : '#9090b0', textAlign: 'center', width: '100%', padding: '10px 0' }}>
            색상 추출 실패
          </div>
        ) : (
          colors.map((hex) => (
            <div
              key={hex}
              role="button"
              tabIndex={0}
              aria-label={`색상 ${hex} 복사`}
              onClick={() => handleCopy(hex)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopy(hex); } }}
              style={{
                flex: 1, height: 44, borderRadius: 10, background: hex,
                cursor: 'pointer', position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              {/* HEX 텍스트 */}
              <div style={{
                position: 'absolute', bottom: 4, left: 0, right: 0,
                textAlign: 'center', fontSize: 9, fontWeight: 700,
                color: isLight(hex) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)',
                letterSpacing: '0.03em',
              }}>
                {hex.toUpperCase()}
              </div>
              {/* 복사 완료 오버레이 */}
              {copied === hex && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 10,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff',
                }}>✓</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
