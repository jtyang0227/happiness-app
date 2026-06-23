import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TemplateScrl({ member, photos, profileName }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [titleVisible, setTitleVisible] = useState(false);
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const hoverTimerRef = useRef(null);

  const profileNameDisplay = member?.profileName || profileName || '';
  const displayPhotos = photos.slice(0, 50);

  // IntersectionObserver — 현재 슬라이드 추적
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = Number(e.target.dataset.index);
            setCurrent(idx);
            setTitleVisible(false);
            // 0.8s 후 제목 표시
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => setTitleVisible(true), 800);
          }
        });
      },
      { threshold: 0.5 }
    );

    slideRefs.current.forEach(el => { if (el) observer.observe(el); });
    return () => {
      observer.disconnect();
      clearTimeout(hoverTimerRef.current);
    };
  }, [displayPhotos.length]);

  // 키보드 네비게이션
  const scrollToSlide = useCallback((idx) => {
    const el = slideRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        scrollToSlide(Math.min(current + 1, displayPhotos.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToSlide(Math.max(current - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, displayPhotos.length, scrollToSlide]);

  if (displayPhotos.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 15 }}>
        아직 등록된 작품이 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
        background: '#000',
      }}
    >
      {displayPhotos.map((photo, i) => (
        <div
          key={photo.id}
          ref={el => { slideRefs.current[i] = el; }}
          data-index={i}
          style={{
            height: '100vh',
            scrollSnapAlign: 'start',
            position: 'relative',
            background: '#000',
            overflow: 'hidden',
          }}
          onClick={() => navigate(`/photo/${photo.id}`)}
        >
          {/* 사진 */}
          <img
            src={photo.imageUrl || photo.thumbnailUrl}
            alt={photo.title || '사진'}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              cursor: 'pointer',
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />

          {/* 하단 오버레이 그라디언트 */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 180,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
            pointerEvents: 'none',
          }} />

          {/* 좌하단: 사진 제목 */}
          <div style={{
            position: 'absolute',
            bottom: 40, left: 32,
            opacity: current === i && titleVisible ? 1 : 0,
            transform: current === i && titleVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            pointerEvents: 'none',
          }}>
            {photo.title && (
              <div style={{ fontSize: 16, fontWeight: 300, color: '#fff', letterSpacing: '0.05em', marginBottom: 4 }}>
                {photo.title}
              </div>
            )}
            {photo.colorMood && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {photo.colorMood}
              </div>
            )}
          </div>

          {/* 우하단: 진행 번호 */}
          <div style={{
            position: 'absolute',
            bottom: 40, right: 32,
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.12em',
            fontWeight: 500,
            pointerEvents: 'none',
          }}>
            {String(i + 1).padStart(2, '0')} / {String(displayPhotos.length).padStart(2, '0')}
          </div>
        </div>
      ))}

      {/* 우측 도트 인디케이터 (최대 7개) */}
      <div style={{
        position: 'fixed',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        {displayPhotos.slice(0, 7).map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: current === i ? 16 : 4,
              borderRadius: 2,
              background: current === i ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
        {displayPhotos.length > 7 && (
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        )}
      </div>

      {/* 작가명 (상단 좌측 고정) */}
      <div style={{
        position: 'fixed',
        top: 24, left: 28,
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {member?.name || profileNameDisplay}
        </div>
      </div>
    </div>
  );
}
