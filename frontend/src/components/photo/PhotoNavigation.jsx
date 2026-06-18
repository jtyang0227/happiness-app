import React, { useEffect } from 'react';

export default function PhotoNavigation({ currentId, photoList = [], onNavigate }) {
  const idx = photoList.findIndex(p => String(p.id) === String(currentId));
  const hasPrev = idx > 0;
  const hasNext = idx !== -1 && idx < photoList.length - 1;
  const prevId  = hasPrev ? photoList[idx - 1].id : null;
  const nextId  = hasNext ? photoList[idx + 1].id : null;

  useEffect(() => {
    if (photoList.length === 0) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(prevId);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(nextId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPrev, hasNext, prevId, nextId, onNavigate, photoList.length]);

  if (photoList.length === 0) return null;

  const btn = (visible, onClick, icon, side) => (
    <button
      onClick={visible ? onClick : undefined}
      title={side === 'left' ? '이전 사진 (←)' : '다음 사진 (→)'}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [side === 'left' ? 'left' : 'right']: -20,
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff', fontSize: 22, cursor: visible ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0.3, pointerEvents: visible ? 'auto' : 'none',
        transition: 'background 0.15s',
        zIndex: 2,
      }}
      onMouseEnter={e => { if (visible) e.currentTarget.style.background = 'rgba(0,0,0,0.72)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)'; }}
    >{icon}</button>
  );

  return (
    <>
      {btn(hasPrev, () => onNavigate(prevId), '‹', 'left')}
      {btn(hasNext, () => onNavigate(nextId), '›', 'right')}
    </>
  );
}
