import React from 'react';

export default function PrintButton({ label = 'PDF 저장', onBeforePrint }) {
  const handleClick = () => {
    if (onBeforePrint) onBeforePrint();
    requestAnimationFrame(() => window.print());
  };

  return (
    <button
      onClick={handleClick}
      style={{
        height: 36, padding: '0 14px', borderRadius: 10, fontSize: 13,
        background: 'rgba(255,255,255,0.1)', color: '#e8e8f0',
        border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      📥 {label}
    </button>
  );
}
