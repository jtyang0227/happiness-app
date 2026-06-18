import React, { useEffect } from 'react';

export default function PhotoViewer({
  isOpen, imageUrl, title,
  onClose, onPrev, onNext,
  hasPrev = false, hasNext = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, hasPrev, hasNext, onClose, onPrev, onNext]);

  if (!isOpen) return null;

  const navBtn = (visible, onClick, icon, side) => (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [side]: 12, width: 50, height: 50, borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff', fontSize: 26, cursor: visible ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0.2, pointerEvents: visible ? 'auto' : 'none',
        transition: 'background 0.2s',
        zIndex: 2,
      }}
      onMouseEnter={e => { if (visible) e.currentTarget.style.background = 'rgba(255,255,255,0.32)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
    >{icon}</button>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'viewer-fadein 0.15s ease',
      }}
    >
      <style>{`@keyframes viewer-fadein { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* 상단 바 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 3,
      }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
          {title || '사진 보기'}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        >×</button>
      </div>

      {/* 이미지 */}
      <img
        src={imageUrl}
        alt={title || '사진'}
        onClick={onClose}
        style={{
          maxWidth: '95vw', maxHeight: '88vh',
          objectFit: 'contain', display: 'block',
          cursor: 'zoom-out',
        }}
      />

      {/* 이전/다음 버튼 */}
      {navBtn(hasPrev, onPrev, '‹', 'left')}
      {navBtn(hasNext, onNext, '›', 'right')}
    </div>
  );
}
