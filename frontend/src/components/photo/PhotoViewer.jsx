import React, { useEffect } from 'react';

/**
 * 전체화면 뷰어 전용 "글라스" 머티리얼(Apple Liquid Glass 참고) — 슬라이드쇼(
 * PortfolioSlideshowPage.jsx)와 동일한 레시피. 풀블리드 사진 위에 뜨는 이 뷰어의
 * 컨트롤(닫기·이전·다음 버튼)에만 국한된 로컬 스타일 — 전역 유틸/토큰은 아니다.
 */
const glass = (extra = {}) => ({
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.24)',
  ...extra,
});

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
        color: '#fff', fontSize: 26, cursor: visible ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0.2, pointerEvents: visible ? 'auto' : 'none',
        transition: 'background 0.2s',
        zIndex: 2,
        ...glass(),
      }}
      onMouseEnter={e => { if (visible) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
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
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...glass(),
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
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
