import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PortfolioCoverPage from '../components/portfolio/PortfolioCoverPage';
import PrintButton from '../components/portfolio/PrintButton';
import EmbedCodeModal from '../components/portfolio/EmbedCodeModal';

const MOOD_LABELS = {
  WARM: '따뜻함', COOL: '시원함', DRAMATIC: '드라마틱',
  NATURAL: '자연스러움', ROMANTIC: '로맨틱', SERENE: '평온함',
  ENERGETIC: '에너지', DARK: '어두움',
};

export default function PortfolioSlideshowPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [index, setIndex]         = useState(0);
  const [fading, setFading]       = useState(false);
  const [playing, setPlaying]     = useState(true);
  const [hovering, setHovering]   = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const intervalRef   = useRef(null);
  const touchStartRef = useRef(null);
  const hideTimer     = useRef(null);

  // 포트폴리오 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/portfolio/${profileName}`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError('포트폴리오를 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileName]);

  // 슬라이드 배열: 커버(0) + 사진들
  const member   = data?.member ?? {};
  const photos   = data?.photos ?? [];
  const total    = photos.length + 1; // +1 for cover

  const goTo = useCallback((next) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setIndex(Math.max(0, Math.min(next, total - 1)));
      setFading(false);
    }, 220);
  }, [fading, total]);

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  // 자동 재생
  useEffect(() => {
    if (playing && !hovering && total > 1) {
      intervalRef.current = setInterval(() => {
        setIndex(i => (i + 1) % total);
      }, 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, hovering, total]);

  // 키보드
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === ' ')          { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === 'Escape')     navigate(`/portfolio/${profileName}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, navigate, profileName]);

  // 마우스 움직임 → 컨트롤 표시
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  // 터치 스와이프
  const onTouchStart = e => { touchStartRef.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (touchStartRef.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartRef.current;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
    touchStartRef.current = null;
  };

  // 인디케이터 최대 7개 표시
  const dots = Math.min(total, 7);
  const dotOffset = total <= 7 ? 0 : Math.max(0, Math.min(index - 3, total - 7));

  const specialties = member.specialties
    ? member.specialties.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  /* ── Loading / Error ── */
  if (loading) return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1e1e3a', borderTopColor: '#5b6ef5', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ color: '#6060a0', fontSize: 14 }}>{error}</div>
      <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', borderRadius: 8, background: '#5b6ef5', border: 'none', color: '#fff', cursor: 'pointer' }}>돌아가기</button>
    </div>
  );

  const currentPhoto = index === 0 ? null : photos[index - 1];

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { setHovering(true); setShowControls(true); }}
      onMouseLeave={() => { setHovering(false); clearTimeout(hideTimer.current); setShowControls(false); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @keyframes slideIn { from { opacity: 0; } to { opacity: 1; } }
        @media print {
          .slideshow-controls { display: none !important; }
          .slide-page { page-break-after: always; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
          .slide-image { max-width: 100%; max-height: 90vh; object-fit: contain; }
          .cover-page { background: #0a0a18 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0; size: A4 landscape; }
        }
      `}</style>

      {/* ── 슬라이드 콘텐츠 ── */}
      <div style={{
        width: '100%', height: '100%', position: 'absolute', inset: 0,
        opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease',
      }}
        className={index === 0 ? 'slide-page cover-page' : 'slide-page'}
      >
        {index === 0 ? (
          <PortfolioCoverPage
            coverImageUrl={member.coverUrl}
            artistName={member.name ?? profileName}
            profileName={profileName}
            bio={member.bio}
            specialties={specialties}
            photoCount={photos.length}
            seriesCount={data?.series?.length ?? 0}
          />
        ) : currentPhoto ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={currentPhoto.imageUrl}
              alt={currentPhoto.title || '사진'}
              className="slide-image"
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' }}
            />
          </div>
        ) : null}
      </div>

      {/* ── 상단 바 ── */}
      <div
        className="slideshow-controls"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 72, zIndex: 10,
          background: 'linear-gradient(rgba(0,0,0,0.55) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          opacity: showControls ? 1 : 0, transition: 'opacity 0.4s',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => navigate(`/portfolio/${profileName}`)}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
          }}
        >← 갤러리로</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{member.name ?? profileName}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>@{profileName}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PrintButton label="PDF 저장" />
          <button
            onClick={() => setEmbedOpen(true)}
            style={{
              height: 36, padding: '0 14px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.1)', color: '#e8e8f0',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            }}
          >{'</>'} 임베드</button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', minWidth: 50, textAlign: 'right' }}>
            {index + 1} / {total}
          </span>
        </div>
      </div>

      {/* ── 이전 버튼 ── */}
      <button
        className="slideshow-controls"
        onClick={goPrev}
        style={{
          position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
          width: 50, height: 50, borderRadius: '50%', fontSize: 20,
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', cursor: index === 0 ? 'default' : 'pointer',
          opacity: showControls ? (index === 0 ? 0.3 : 1) : 0,
          transition: 'opacity 0.4s', zIndex: 10, pointerEvents: showControls && index > 0 ? 'auto' : 'none',
        }}
      >‹</button>

      {/* ── 다음 버튼 ── */}
      <button
        className="slideshow-controls"
        onClick={goNext}
        style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          width: 50, height: 50, borderRadius: '50%', fontSize: 20,
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', cursor: index === total - 1 ? 'default' : 'pointer',
          opacity: showControls ? (index === total - 1 ? 0.3 : 1) : 0,
          transition: 'opacity 0.4s', zIndex: 10, pointerEvents: showControls && index < total - 1 ? 'auto' : 'none',
        }}
      >›</button>

      {/* ── 하단 바 ── */}
      <div
        className="slideshow-controls"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 80, zIndex: 10,
          background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.55) 100%)',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          opacity: showControls ? 1 : 0, transition: 'opacity 0.4s',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* 제목 + 무드 */}
        <div style={{ flex: 1 }}>
          {currentPhoto?.title && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{currentPhoto.title}</div>
          )}
          {currentPhoto?.colorMood && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {MOOD_LABELS[currentPhoto.colorMood] ?? currentPhoto.colorMood}
            </div>
          )}
        </div>

        {/* 인디케이터 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: dots }, (_, i) => i + dotOffset).map(i => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === index ? 20 : 6, height: 6, borderRadius: 3,
                background: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>

        {/* 자동재생 토글 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPlaying(p => !p)}
            style={{
              width: 36, height: 36, borderRadius: '50%', fontSize: 14,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
            }}
          >{playing ? '⏸' : '▶'}</button>
        </div>
      </div>

      {/* 임베드 모달 */}
      <EmbedCodeModal
        isOpen={embedOpen}
        onClose={() => setEmbedOpen(false)}
        profileName={profileName}
      />
    </div>
  );
}
