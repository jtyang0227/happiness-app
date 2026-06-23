import { useState, useEffect, useCallback, useRef } from 'react';
import MagazineSpread from './MagazineSpread';

const PAN_LABELS = {
  FULL_BLEED: '전면판', SPLIT: '2분할판', EDITORIAL: '편집판',
  TRIPTYCH: '3면판', FEATURE: '화보판', PORTRAIT_FOCUS: '인물판', FILM_STRIP: '필름판',
};

function Thumbnail({ photo, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, width: 60, height: 44, padding: 0, cursor: 'pointer',
        border: `2px solid ${isActive ? '#5b6ef5' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 6, overflow: 'hidden', background: '#111', transition: 'border-color 0.15s',
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  );
}

export default function MagazineViewer({ photos = [], initialIndex = 0, title, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(Math.min(initialIndex, photos.length - 1));
  const [direction, setDirection] = useState('next');
  const [transitioning, setTransitioning] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const thumbStripRef = useRef(null);

  const total = photos.length;
  const currentPhoto = photos[currentIdx];

  const goTo = useCallback((idx) => {
    if (idx === currentIdx || transitioning) return;
    setDirection(idx > currentIdx ? 'next' : 'prev');
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIdx(idx);
      setTransitioning(false);
    }, 320);
  }, [currentIdx, transitioning]);

  const goPrev = useCallback(() => goTo(Math.max(0, currentIdx - 1)), [goTo, currentIdx]);
  const goNext = useCallback(() => goTo(Math.min(total - 1, currentIdx + 1)), [goTo, currentIdx, total]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft')  { goPrev(); return; }
      if (e.key === 'ArrowRight') { goNext(); return; }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, onClose]);

  // body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 썸네일 자동 스크롤
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const thumbs = strip.querySelectorAll('button');
    if (thumbs[currentIdx]) {
      thumbs[currentIdx].scrollIntoView({ inline: 'center', behavior: 'smooth' });
    }
  }, [currentIdx]);

  // 인쇄
  const handlePrint = () => window.print();

  // 공유
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: currentPhoto?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const slideStyle = {
    transition: 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.32s',
    transform: transitioning
      ? `translateX(${direction === 'next' ? '-100%' : '100%'})`
      : 'translateX(0)',
    opacity: transitioning ? 0 : 1,
  };

  if (!currentPhoto) return null;

  const dots = total <= 7 ? photos : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: '#0a0a18', color: '#fff',
    }}>
      {/* 상단 바 */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 16, flexShrink: 0,
        background: 'rgba(10,10,24,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 10,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1,
        }}>
          ←
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
          {title || '매거진 뷰'}
        </span>
        <button onClick={() => setTocOpen(o => !o)} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
          padding: '5px 12px', borderRadius: 8,
        }}>
          ☰
        </button>
        <button onClick={handleShare} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          fontSize: 18, cursor: 'pointer', padding: 4,
        }}>↗</button>
        <button onClick={handlePrint} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          fontSize: 18, cursor: 'pointer', padding: 4,
        }}>🖨</button>
      </div>

      {/* 본문 영역 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 슬라이드 영역 */}
        <div style={{ ...slideStyle, width: '100%', height: '100%' }}>
          <MagazineSpread
            photo={currentPhoto}
            pageNumber={currentIdx + 1}
            totalPages={total}
          />
        </div>

        {/* 이전/다음 화살표 */}
        {currentIdx > 0 && (
          <button onClick={goPrev} aria-label="이전 면" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>◁</button>
        )}
        {currentIdx < total - 1 && (
          <button onClick={goNext} aria-label="다음 면" style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>▷</button>
        )}

        {/* 목차 사이드 패널 */}
        {tocOpen && (
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 240,
            background: 'rgba(12,12,30,0.97)', backdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            zIndex: 20, overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 16px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                목차
              </span>
              <button onClick={() => setTocOpen(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: 16,
              }}>✕</button>
            </div>
            <div style={{ padding: '8px 8px' }}>
              {photos.map((p, i) => (
                <button
                  key={p.id || i}
                  onClick={() => { goTo(i); setTocOpen(false); }}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    width: '100%', padding: '8px 8px', borderRadius: 8,
                    background: i === currentIdx ? 'rgba(91,110,245,0.2)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    color: i === currentIdx ? '#a0aaff' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  <div style={{
                    width: 44, height: 32, borderRadius: 4, overflow: 'hidden',
                    background: '#222', flexShrink: 0,
                  }}>
                    <img
                      src={p.thumbnailUrl || p.imageUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 12, fontWeight: 500,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      {p.title || `면 ${i + 1}`}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      {PAN_LABELS[p.panType] || '편집판'}
                    </p>
                  </div>
                  {i === currentIdx && (
                    <span style={{ fontSize: 10, color: '#5b6ef5' }}>●</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div style={{
        height: 68, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', flexShrink: 0,
        background: 'rgba(10,10,24,0.9)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* 썸네일 스트립 */}
        <div
          ref={thumbStripRef}
          style={{
            display: 'flex', gap: 6, flex: 1, overflowX: 'auto',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}
        >
          {photos.map((p, i) => (
            <Thumbnail
              key={p.id || i}
              photo={p}
              isActive={i === currentIdx}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* 도트 인디케이터 */}
        {dots && (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {dots.map((_, i) => (
              <div
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === currentIdx ? 16 : 6,
                  height: 6, borderRadius: 3,
                  background: i === currentIdx ? '#5b6ef5' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
                }}
              />
            ))}
          </div>
        )}

        {/* 면 번호 */}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
          {currentIdx + 1} / {total}
        </span>
      </div>
    </div>
  );
}
