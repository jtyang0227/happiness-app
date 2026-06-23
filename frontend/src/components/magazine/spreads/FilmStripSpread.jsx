import { useRef, useState } from 'react';

function Perforation() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'center' }}>
      {Array(20).fill(null).map((_, i) => (
        <div key={i} style={{
          width: 12, height: 8, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)', flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

export default function FilmStripSpread({ photo, supportPhotos = [] }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const allPhotos = [photo, ...supportPhotos].filter(Boolean);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 290, behavior: 'smooth' });
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#1a1a1a', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', position: 'relative',
    }}>
      {/* 상단 퍼포레이션 */}
      <div style={{ overflowX: 'hidden', padding: '0 16px' }}>
        <Perforation />
      </div>

      {/* 필름 프레임 스크롤 */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          padding: '8px 32px', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        {allPhotos.map((p, i) => (
          <div
            key={p.id || i}
            onClick={() => setActiveIdx(i)}
            style={{
              flexShrink: 0, width: 260, height: 260,
              scrollSnapAlign: 'center', cursor: 'pointer',
              border: `2px solid ${activeIdx === i ? '#5b6ef5' : 'rgba(255,255,255,0.08)'}`,
              transition: 'border-color 0.2s', position: 'relative',
            }}
          >
            <img
              src={p.imageUrl}
              alt={p.title || `프레임 ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }}
            />
            {/* 프레임 번호 */}
            <div style={{
              position: 'absolute', bottom: 6, right: 6,
              fontSize: 10, color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 퍼포레이션 */}
      <div style={{ overflowX: 'hidden', padding: '0 16px' }}>
        <Perforation />
      </div>

      {/* 캡션 */}
      <div style={{ padding: '16px 32px', color: 'rgba(255,255,255,0.7)' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {allPhotos[activeIdx]?.title || photo.title}
        </p>
        {allPhotos[activeIdx]?.description && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {allPhotos[activeIdx].description}
          </p>
        )}
      </div>

      {/* 네비게이션 */}
      <button onClick={() => scroll(-1)} style={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
        width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18,
      }}>◁</button>
      <button onClick={() => scroll(1)} style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
        width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18,
      }}>▷</button>

      {/* 판 뱃지 */}
      <div style={{
        position: 'absolute', top: 12, right: 16,
        background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
        fontSize: 11, padding: '4px 10px', borderRadius: 8,
      }}>
        필름판
      </div>
    </div>
  );
}
