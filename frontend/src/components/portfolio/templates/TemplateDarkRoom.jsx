import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOOD_COLORS } from '../../../constants/colors';

export default function TemplateDarkRoom({ member, photos, profileName }) {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });
  const [featuredPhoto, setFeaturedPhoto] = useState(null);
  const [moodFilter, setMoodFilter] = useState('');
  const [hovered, setHovered] = useState(null);

  const profileNameDisplay = member?.profileName || profileName || '';
  const availableMoods = [...new Set(photos.map(p => p.colorMood).filter(Boolean))];
  const filteredPhotos = moodFilter ? photos.filter(p => p.colorMood === moodFilter) : photos;

  // 최초 피처 사진 = 첫 번째 사진
  useEffect(() => {
    if (photos.length > 0 && !featuredPhoto) {
      setFeaturedPhoto(photos[0]);
    }
  }, [photos]);

  // 마우스 위치 추적 → 스포트라이트
  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: `${e.clientX}px`, y: `${e.clientY}px` });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#cccccc',
    }}>
      {/* 스포트라이트 오버레이 */}
      <div style={{
        background: `radial-gradient(circle 280px at ${mousePos.x} ${mousePos.y}, rgba(255,255,255,0.05) 0%, transparent 70%)`,
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* 헤더 */}
      <div style={{
        padding: '40px 32px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
              DARK ROOM
            </div>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, color: '#e8e8e8', margin: 0, letterSpacing: '-0.02em' }}>
              {member?.name || profileNameDisplay}
            </h1>
            {member?.bio && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 8, maxWidth: 400, lineHeight: 1.6 }}>
                {member.bio}
              </p>
            )}
          </div>

          <button
            onClick={() => navigate(`/inquiry/${profileNameDisplay}?memberId=${member?.id ?? ''}`)}
            style={{
              padding: '10px 24px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            문의하기
          </button>
        </div>
      </div>

      {/* 무드 필터 */}
      {availableMoods.length > 0 && (
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          position: 'relative', zIndex: 2,
        }}>
          <button
            onClick={() => setMoodFilter('')}
            style={{
              flexShrink: 0, padding: '4px 14px', borderRadius: 3, fontSize: 11, fontWeight: 700,
              border: !moodFilter ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: !moodFilter ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >ALL {photos.length}</button>

          {availableMoods.map(mood => {
            const md = MOOD_COLORS?.[mood];
            const active = moodFilter === mood;
            const count = photos.filter(p => p.colorMood === mood).length;
            return (
              <button
                key={mood}
                onClick={() => setMoodFilter(active ? '' : mood)}
                style={{
                  flexShrink: 0, padding: '4px 14px', borderRadius: 3, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${active ? (md?.dot || '#fff') : 'rgba(255,255,255,0.1)'}`,
                  background: active ? `${md?.dot || '#fff'}18` : 'transparent',
                  color: active ? (md?.dot || '#fff') : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: md?.dot || '#888', display: 'inline-block' }} />
                {md?.label || mood} {count}
              </button>
            );
          })}
        </div>
      )}

      {/* 사진 그리드 + 피처 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px', position: 'relative', zIndex: 2 }}>
        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
            {moodFilter ? '해당 분위기의 작품이 없습니다.' : '아직 등록된 작품이 없습니다.'}
          </div>
        ) : (
          <>
            {/* 썸네일 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 2,
              marginBottom: 32,
            }}>
              {filteredPhotos.map(photo => (
                <div
                  key={photo.id}
                  onMouseEnter={() => setHovered(photo.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    setFeaturedPhoto(photo);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    aspectRatio: '1',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    background: '#111',
                    outline: featuredPhoto?.id === photo.id ? '2px solid rgba(255,255,255,0.5)' : 'none',
                    outlineOffset: -2,
                  }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title || '사진'}
                    loading="lazy"
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      transition: 'transform 0.4s ease, filter 0.3s ease',
                      transform: hovered === photo.id ? 'scale(1.06)' : 'scale(1)',
                      filter: hovered === photo.id ? 'brightness(1.1)' : 'brightness(0.75)',
                    }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {/* hover 스포트라이트 효과 */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(circle 100px at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)`,
                    opacity: hovered === photo.id ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                  }} />
                  {/* 제목 오버레이 */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.85) 100%)',
                    display: 'flex', alignItems: 'flex-end', padding: '10px 8px',
                    opacity: hovered === photo.id ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: 'none',
                  }}>
                    {photo.title && (
                      <span style={{ fontSize: 11, color: '#fff', fontWeight: 500, lineHeight: 1.3 }}>
                        {photo.title}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 피처 사진 확대 영역 */}
            {featuredPhoto && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 32,
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>
                  FEATURED
                </div>
                <div
                  style={{
                    position: 'relative',
                    maxWidth: 800,
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/photo/${featuredPhoto.id}`)}
                >
                  <img
                    src={featuredPhoto.imageUrl || featuredPhoto.thumbnailUrl}
                    alt={featuredPhoto.title || '사진'}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                    }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    {featuredPhoto.title && (
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#d0d0d0' }}>{featuredPhoto.title}</div>
                    )}
                    {featuredPhoto.colorMood && MOOD_COLORS?.[featuredPhoto.colorMood] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: MOOD_COLORS[featuredPhoto.colorMood].dot }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {MOOD_COLORS[featuredPhoto.colorMood].label}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
                      클릭하여 상세보기 →
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '48px 32px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em' }}>
          ✦ HAPPINESS — DARK ROOM
        </div>
      </div>
    </div>
  );
}
