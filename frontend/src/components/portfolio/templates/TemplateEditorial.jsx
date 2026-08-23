import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOOD_COLORS } from '../../../constants/colors';
import MagazineGrid from '../MagazineGrid';
import { seriesApi } from '../../../services/api';
import { testimonialApi, pressApi, brandApi } from '../../../services/portfolioApi';
import TestimonialsSection from '../TestimonialsSection';
import PressAwardsSection from '../PressAwardsSection';
import ClientLogoWall from '../ClientLogoWall';

/* ── 스크롤 진입 시 페이드+슬라이드업 리빌 ──────────── */
function Reveal({ children, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.unobserve(el); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="portfolio-reveal"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Masonry Photo Item ──────────────────────────── */
function MasonryPhoto({ photo, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(photo.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        breakInside: 'avoid', marginBottom: 4, cursor: 'pointer',
        position: 'relative', overflow: 'hidden', display: 'block',
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title || '사진'}
        loading="lazy"
        style={{
          width: '100%', height: 'auto', display: 'block',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8) 100%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', padding: '16px 12px',
      }}>
        {photo.title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
            {photo.title}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>♡ {photo.likesCount ?? 0}</div>
      </div>
    </div>
  );
}

/* ── Series Card ─────────────────────────────────── */
function SeriesScrollCard({ series, onPhotoClick }) {
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    if (!open && !detail) {
      try {
        const res = await seriesApi.getOne(series.id);
        setDetail(res?.data ?? res);
      } catch { setDetail({ photos: [] }); }
    }
    setOpen(v => !v);
  };

  return (
    <div style={{ flexShrink: 0, width: 240 }}>
      <div
        onClick={handleClick}
        style={{
          width: 240, borderRadius: 12, overflow: 'hidden',
          cursor: 'pointer', background: '#12122a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ position: 'relative', height: 135, background: '#0a0a18', overflow: 'hidden' }}>
          {(() => {
            const imgs = (series.previewPhotos?.length ? series.previewPhotos : [series.coverImageUrl]).filter(Boolean);
            if (imgs.length === 0) {
              return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#3a3a6a' }}>✦</div>;
            }
            if (imgs.length === 1) {
              return <img src={imgs[0]} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />;
            }
            return (
              <div style={{ display: 'flex', gap: 2, height: '100%' }}>
                <div style={{ flex: 1.5, height: '100%' }}>
                  <img src={imgs[0]} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <img src={imgs[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                  {imgs[2] && (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <img src={imgs[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            {series.photoCount ?? 0}장
          </div>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0f0', marginBottom: 2 }}>{series.title}</div>
          {series.description && (
            <div style={{ fontSize: 11, color: '#6060a0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {series.description}
            </div>
          )}
        </div>
      </div>

      {open && detail && (
        <div style={{ marginTop: 8, background: '#12122a', borderRadius: 10, padding: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {(detail.photos ?? []).slice(0, 6).map(p => (
            <div key={p.id} onClick={() => onPhotoClick(p.id)}
              style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <img src={p.thumbnailUrl || p.imageUrl} alt={p.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Editorial Template ─────────────────────── */
export default function TemplateEditorial({
  member, photos, series, photoCount, followerCount, followingCount, totalLikes,
  profileName, isOwnPage, following, followLoading, onFollow, onOpenFollowModal,
  onInquiry, onSlideshow, onPhotoClick,
}) {
  const navigate = useNavigate();
  const filterBarRef = useRef(null);
  const [moodFilter, setMoodFilter] = useState('');
  const [heroEntered, setHeroEntered] = useState(false);

  const [testimonials, setTestimonials] = useState([]);
  const [press, setPress] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [brands, setBrands] = useState([]);

  /* ── 신뢰 신호(추천사·언론·클라이언트) 로드 ── */
  useEffect(() => {
    const memberId = member?.id;
    if (!memberId) return;
    let cancelled = false;
    testimonialApi.list(memberId).then(res => { if (!cancelled) setTestimonials(Array.isArray(res) ? res : []); }).catch(() => {});
    pressApi.list(memberId).then(res => {
      if (cancelled) return;
      setPress(Array.isArray(res?.press) ? res.press : []);
      setAchievements(Array.isArray(res?.achievements) ? res.achievements : []);
    }).catch(() => {});
    brandApi.list(memberId).then(res => { if (!cancelled) setBrands(Array.isArray(res) ? res : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [member?.id]);

  /* ── 히어로 등장 애니메이션 트리거 (prefers-reduced-motion 사용자는 즉시 표시) ── */
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setHeroEntered(true);
      return;
    }
    const t = setTimeout(() => setHeroEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  const specialties = member?.specialties ? member.specialties.split(',').map(s => s.trim()).filter(Boolean) : [];
  const joinYear = member?.createdAt ? new Date(member.createdAt).getFullYear() : null;
  const availableMoods = [...new Set(photos.map(p => p.colorMood).filter(Boolean))];
  const filteredPhotos = moodFilter ? photos.filter(p => p.colorMood === moodFilter) : photos;
  const hasCover = !!member?.coverUrl;
  const isMagazine = member?.portfolioLayout === 'magazine';

  const handlePhotoClick = onPhotoClick || ((id) => navigate(`/photo/${id}`));
  const pName = member?.profileName || profileName || '';

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', color: '#e8e8f0' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .portfolio-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', height: '82vh', minHeight: 480, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        {hasCover ? (
          <img src={member.coverUrl} alt="커버"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #12122a 0%, #0a0a18 50%, #0e0e0e 100%)' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 25% 35%, #E8121A 0%, transparent 50%), radial-gradient(circle at 75% 65%, #22D3EE 0%, transparent 50%)' }} />
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.92) 100%)' }} />

        {/* 고스트 타이포 — 이니셜을 배경 레이어로 깔아 매거진 커버 같은 깊이감을 만든다 */}
        <div aria-hidden="true" style={{
          position: 'absolute', right: '3%', bottom: '8%', zIndex: 0,
          fontSize: 'min(38vw, 320px)', fontWeight: 900, lineHeight: 1,
          color: 'rgba(255,255,255,0.045)', letterSpacing: '-0.05em',
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {(member?.name ?? pName ?? '?').charAt(0)}
        </div>

        <div style={{ position: 'relative', width: '100%', padding: '0 32px 0', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 20,
            opacity: heroEntered ? 1 : 0, transform: heroEntered ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #E8121A, #22D3EE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
              border: '2.5px solid rgba(255,255,255,0.25)', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}>
              {member?.avatarUrl
                ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (member?.name?.charAt(0) ?? '?')}
            </div>

            {/* 시그니처 스탬프 — 작가의 도장/서명처럼 기능하는 배지 */}
            <div style={{
              width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
              border: '2px solid #E8121A', background: 'rgba(232,18,26,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'rotate(-10deg)', marginBottom: 2,
            }}>
              <span style={{ fontSize: 18, color: '#ff5a5f', fontWeight: 900 }}>✦</span>
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(34px, 6.5vw, 68px)', fontWeight: 900, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.02, marginBottom: 10,
            opacity: heroEntered ? 1 : 0, transform: heroEntered ? 'translateY(0)' : 'translateY(22px)',
            transition: 'opacity 0.65s cubic-bezier(0.4,0,0.2,1) 0.08s, transform 0.65s cubic-bezier(0.4,0,0.2,1) 0.08s',
          }}>
            {member?.name ?? pName}
          </h1>

          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20,
            opacity: heroEntered ? 1 : 0, transform: heroEntered ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1) 0.16s, transform 0.6s cubic-bezier(0.4,0,0.2,1) 0.16s',
          }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>@{pName}</span>
            {joinYear && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>· Since {joinYear}</span>}
            {member?.location && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>· {member.location}</span>}
            {specialties.map(sp => (
              <span key={sp} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>{sp}</span>
            ))}
          </div>

          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            opacity: heroEntered ? 1 : 0, transform: heroEntered ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1) 0.24s, transform 0.6s cubic-bezier(0.4,0,0.2,1) 0.24s',
          }}>
            {member?.websiteUrl && (
              <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 18px', borderRadius: 24, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                🔗 웹사이트
              </a>
            )}
            {member?.instagramId && (
              <a href={`https://instagram.com/${member.instagramId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 18px', borderRadius: 24, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                @ Instagram
              </a>
            )}
            {onFollow && (
              <button onClick={onFollow} disabled={followLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 24, fontSize: 13, fontWeight: 700, border: following ? '1px solid rgba(255,255,255,0.2)' : 'none', background: following ? 'rgba(255,255,255,0.1)' : '#E8121A', color: '#fff', cursor: followLoading ? 'not-allowed' : 'pointer', opacity: followLoading ? 0.7 : 1, backdropFilter: 'blur(8px)' }}>
                {following ? '✓ 팔로잉' : '+ 팔로우'}
              </button>
            )}
            <button
              onClick={() => onInquiry ? onInquiry() : navigate(`/inquiry/${pName}?memberId=${member?.id ?? ''}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 24, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232, 18, 26,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >✉ 촬영 문의하기</button>
            <button
              onClick={() => onSlideshow ? onSlideshow() : navigate(`/portfolio/${pName}/slideshow`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 24, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#e8e8f0', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >▶ 슬라이드쇼</button>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'center', gap: 0,
        }}>
          {[
            { value: photoCount ?? photos.length, label: '작품' },
            { value: followerCount ?? 0, label: '팔로워', onClick: onOpenFollowModal ? () => onOpenFollowModal('followers') : null },
            { value: followingCount ?? 0, label: '팔로잉', onClick: onOpenFollowModal ? () => onOpenFollowModal('following') : null },
            { value: totalLikes ?? 0, label: '총 좋아요' },
            ...(series?.length > 0 ? [{ value: series.length, label: '시리즈' }] : []),
          ].map((stat, i, arr) => (
            <div key={stat.label} onClick={stat.onClick} style={{ flex: 1, maxWidth: 160, padding: '14px 0', textAlign: 'center', cursor: stat.onClick ? 'pointer' : 'default', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
              onMouseEnter={e => { if (stat.onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BIO */}
      {member?.bio && (
        <Reveal style={{ maxWidth: 640, margin: '0 auto', padding: '52px 32px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', wordBreak: 'keep-all' }}>"{member.bio}"</p>
        </Reveal>
      )}

      {/* SPECIALTIES */}
      {specialties.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: `${member?.bio ? '0' : '52px'} 32px 40px`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Reveal style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>전문 분야</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </Reveal>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {specialties.map(sp => {
              const EMOJI_MAP = {
                '웨딩':        '💍',
                '인물/포트레이트': '👤',
                '풍경':        '🌄',
                '제품/광고':    '📦',
                '음식':        '🍽',
                '건축/인테리어': '🏛',
                '스포츠/액션':  '⚡',
                '야생동물':     '🦁',
                '패션':        '👗',
                '이벤트':      '🎊',
              };
              const emoji = EMOJI_MAP[sp] || '✦';
              return (
                <div key={sp} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.01em' }}>{sp}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MOOD FILTER */}
      {availableMoods.length > 0 && (
        <div ref={filterBarRef} style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <button onClick={() => setMoodFilter('')} style={{ flexShrink: 0, padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: !moodFilter ? '1.5px solid #E8121A' : '1.5px solid rgba(255,255,255,0.1)', background: !moodFilter ? 'rgba(232, 18, 26,0.2)' : 'transparent', color: !moodFilter ? '#a0a0ff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>전체 {photos.length}</button>
          {availableMoods.map(mood => {
            const md = MOOD_COLORS?.[mood];
            if (!md) return null;
            const active = moodFilter === mood;
            const count = photos.filter(p => p.colorMood === mood).length;
            return (
              <button key={mood} onClick={() => setMoodFilter(active ? '' : mood)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${active ? md.dot : 'rgba(255,255,255,0.1)'}`, background: active ? `${md.dot}22` : 'transparent', color: active ? md.dot : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: md.dot, display: 'inline-block' }} />
                {md.label} {count}
              </button>
            );
          })}
        </div>
      )}

      {/* GALLERY */}
      <style>{`.portfolio-masonry { columns: 4 220px; column-gap: 4px; } @media (max-width: 900px) { .portfolio-masonry { columns: 3; } } @media (max-width: 600px) { .portfolio-masonry { columns: 2; } }`}</style>

      {filteredPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
          {moodFilter ? '해당 분위기의 작품이 없습니다.' : '아직 등록된 작품이 없습니다.'}
        </div>
      ) : isMagazine ? (
        <div style={{ padding: '4px' }}>
          <MagazineGrid photos={filteredPhotos} onPhotoClick={handlePhotoClick} />
        </div>
      ) : (
        <div className="portfolio-masonry" style={{ padding: '4px 4px' }}>
          {filteredPhotos.map(photo => (
            <MasonryPhoto key={photo.id} photo={photo} onClick={handlePhotoClick} />
          ))}
        </div>
      )}

      {/* SERIES */}
      {series?.length > 0 && (
        <div style={{ padding: '60px 0 48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '0 24px 20px' }}>
            <Reveal style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>컬렉션 · {series.length}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </Reveal>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px', scrollbarWidth: 'none' }}>
            {series.map(s => (
              <SeriesScrollCard key={s.id} series={s} onPhotoClick={handlePhotoClick} />
            ))}
          </div>
        </div>
      )}

      {/* 신뢰 신호 — 추천사 · 언론/수상 · 협업 클라이언트 (데이터가 없으면 각 컴포넌트가 null 반환) */}
      <Reveal><TestimonialsSection testimonials={testimonials} /></Reveal>
      <Reveal><PressAwardsSection press={press} achievements={achievements} /></Reveal>
      <Reveal><ClientLogoWall brands={brands} /></Reveal>

      {/* FOOTER CTA */}
      <div style={{ padding: '64px 24px 48px', textAlign: 'center', background: 'linear-gradient(180deg, transparent 0%, rgba(18,18,42,0.4) 100%)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>Get in Touch</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: '-0.01em' }}>함께 작업하고 싶으신가요?</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 28, lineHeight: 1.7 }}>촬영 의뢰, 협업 제안, 작품 구매 문의를 보내주세요.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(`/inquiry/${pName}?memberId=${member?.id ?? ''}`)}
            style={{ padding: '14px 36px', borderRadius: 28, fontSize: 14, fontWeight: 700, border: 'none', background: '#E8121A', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(232, 18, 26,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            ✉ 촬영 문의하기
          </button>
          <a href={`/booking/${pName}`}
            style={{ padding: '14px 36px', borderRadius: 28, fontSize: 14, fontWeight: 700, border: '1px solid #22D3EE', background: 'rgba(34, 211, 238,0.12)', color: '#22D3EE', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(34, 211, 238,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(34, 211, 238,0.12)'; }}>
            📅 촬영 예약
          </a>
        </div>
        <div style={{ marginTop: 40, fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.08em' }}>✦ Happiness — 포트폴리오 갤러리</div>
      </div>
    </div>
  );
}
