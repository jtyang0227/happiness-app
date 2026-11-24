import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { COLORS } from '../../constants/colors';

export default function LeftPanel() {
  const { state, dispatch } = useEditor();
  const { images, selectedId } = state;
  const dragIdx = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredDelId, setHoveredDelId] = useState(null);

  // Paste upload
  useEffect(() => {
    const handler = e => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(f =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
      );
      if (files.length === 0) return;
      if (images.length >= 100) { alert('최대 100장까지 업로드 가능합니다.'); return; }
      dispatch({ type: 'IMAGES_ADD', files });
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [dispatch, images.length]);

  const handleDragStart = (e, idx) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = [...images];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    dispatch({ type: 'IMAGES_REORDER', images: next });
    dragIdx.current = null;
  };

  if (images.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: 16,
      }}>
        <div style={{ fontSize: 28 }}>📁</div>
        <p style={{ fontSize: 12, color: COLORS.darkTextHint, textAlign: 'center', lineHeight: 1.5 }}>
          이미지를 추가하세요
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {images.map((img, idx) => {
          const isSelected = img.id === selectedId;
          const isHovered  = hoveredId === img.id;
          return (
            <div
              key={img.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => dispatch({ type: 'IMAGE_SELECT', id: img.id })}
              onMouseEnter={() => setHoveredId(img.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'relative', borderRadius: 8, overflow: 'hidden',
                cursor: 'pointer', border: `2px solid ${isSelected ? COLORS.primary : isHovered ? COLORS.darkBorder : 'transparent'}`,
                transition: 'border-color 0.15s',
                opacity: dragIdx.current !== null ? 0.7 : 1,
              }}
            >
              <div style={{ aspectRatio: '1', background: '#000' }}>
                <img
                  src={img.objectUrl}
                  alt={img.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 4, left: 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: COLORS.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 700,
                }}>✓</div>
              )}

              {/* Delete button — show on hover */}
              {(isHovered || hoveredDelId === img.id) && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    dispatch({ type: 'IMAGES_REMOVE', id: img.id });
                  }}
                  onMouseEnter={() => setHoveredDelId(img.id)}
                  onMouseLeave={() => setHoveredDelId(null)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none',
                    color: '#fff', cursor: 'pointer', fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >×</button>
              )}

              {/* Filename */}
              <div style={{
                padding: '3px 5px', fontSize: 9, color: COLORS.darkTextSub,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                background: COLORS.darkSurface,
              }}>
                {img.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
