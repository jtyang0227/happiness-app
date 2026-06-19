import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOOD_COLORS } from '../constants/colors';
import apiClient from '../api/apiClient';
import { followApi, seriesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MagazineGrid from '../components/portfolio/MagazineGrid';

/* ── Masonry Gallery Item ─────────────────────────────── */
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

/* ── Series Horizontal Card ───────────────────────────── */
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

  const firstPhoto = detail?.photos?.[0];

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
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a0a18', overflow: 'hidden' }}>
          {series.coverImageUrl ? (
            <img src={series.coverImageUrl} alt={series.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#3a3a6a' }}>✦</div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 8, left: 10,
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          }}>
            {series.photoCount ?? 0}장
          </div>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0f0', marginBottom: 2 }}>{series.title}</div>
          {series.description && (
            <div style={{
              fontSize: 11, color: '#6060a0', lineHeight: 1.5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{series.description}</div>
          )}
        </div>
      </div>

      {/* 인라인 펼치기 */}
      {open && detail && (
        <div style={{
          marginTop: 8, background: '#12122a', borderRadius: 10, padding: 10,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        }}>
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

/* ── Follow List Modal ────────────────────────────────── */
function FollowListModal({ title, members, loading, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#12122a', borderRadius: 16, padding: 20,
        width: '90%', maxWidth: 360, maxHeight: '70vh', overflow: 'auto',
        border: '1px solid #2a2a50',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#eeeeff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090cc', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#5555aa', fontSize: 13 }}>불러오는 중...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#5555aa', padding: '24px 0', fontSize: 13 }}>목록이 없습니다.</div>
        ) : members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #1e1e3a' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden',
            }}>
              {m.avatarUrl
                ? <img src={m.avatarUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : m.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0f0' }}>{m.name}</div>
              {m.profileName && <div style={{ fontSize: 11, color: '#6060a0' }}>@{m.profileName}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function PortfolioPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const filterBarRef = useRef(null);

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [moodFilter, setMoodFilter] = useState('');

  const [following, setFollowing]         = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [followModal, setFollowModal]               = useState(null);
  const [followModalMembers, setFollowModalMembers] = useState([]);
  const [loadingModal, setLoadingModal]             = useState(false);

  /* ── 포트폴리오 로드 ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setIsPrivate(false);
      try {
        const res = await apiClient.get(`/portfolio/${profileName}`);
        if (!cancelled) {
          setData(res.data);
          setFollowerCount(res.data.followerCount ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 403) setIsPrivate(true);
          else if (err?.response?.status === 404) setError('포트폴리오를 찾을 수 없습니다.');
          else setError('불러오는데 실패했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileName]);

  /* ── 팔로우 여부 ── */
  useEffect(() => {
    if (!data?.member?.id || !user?.id || user.id === data.member.id) return;
    followApi.isFollowing(user.id, data.member.id)
      .then(res => setFollowing(res?.data?.following ?? res?.following ?? false))
      .catch(() => {});
  }, [data?.member?.id, user?.id]);

  const handleFollow = async () => {
    if (!user?.id || !data?.member?.id) return;
    const memberId = data.member.id;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    setFollowerCount(c => c + (prev ? -1 : 1));
    try {
      if (prev) await followApi.unfollow(user.id, memberId);
      else await followApi.follow(user.id, memberId);
    } catch {
      setFollowing(prev);
      setFollowerCount(c => c + (prev ? 1 : -1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenFollowModal = async (type) => {
    if (!data?.member?.id) return;
    setFollowModal(type); setFollowModalMembers([]); setLoadingModal(true);
    try {
      const res = type === 'followers'
        ? await followApi.getFollowers(data.member.id)
        : await followApi.getFollowing(data.member.id);
      const list = res?.data ?? res ?? [];
      setFollowModalMembers(Array.isArray(list) ? list : []);
    } catch { setFollowModalMembers([]); }
    finally { setLoadingModal(false); }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1e1e3a', borderTopColor: '#5b6ef5', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isPrivate) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ color: '#eeeeff', fontSize: 18, fontWeight: 700 }}>비공개 포트폴리오</div>
      <div style={{ color: '#6060a0', fontSize: 14 }}>이 작가의 포트폴리오는 비공개 상태입니다.</div>
      <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>돌아가기</button>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✦</div>
      <div style={{ color: '#9090b0', fontSize: 16 }}>{error}</div>
      <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>로그인하기</button>
    </div>
  );

  const {
    member, photos = [], photoCount = 0, series = [],
    followingCount = 0, totalLikes = 0,
  } = data || {};

  const joinYear    = member?.createdAt ? new Date(member.createdAt).getFullYear() : null;
  const specialties = member?.specialties ? member.specialties.split(',').map(s => s.trim()).filter(Boolean) : [];
  const availableMoods  = [...new Set(photos.map(p => p.colorMood).filter(Boolean))];
  const filteredPhotos  = moodFilter ? photos.filter(p => p.colorMood === moodFilter) : photos;

  const isOwnPage       = user?.id === member?.id;
  const hasCover        = !!member?.coverUrl;
  const isMagazine      = member?.portfolioLayout === 'magazine';

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', color: '#e8e8f0' }}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', height: '82vh', minHeight: 480,
        overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
      }}>
        {/* 배경 */}
        {hasCover ? (
          <img src={member.coverUrl} alt="커버"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #12122a 0%, #0a0a18 50%, #0e0e0e 100%)',
          }}>
            {/* 장식 패턴 */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 25% 35%, #5b6ef5 0%, transparent 50%), radial-gradient(circle at 75% 65%, #a78bfa 0%, transparent 50%)' }} />
          </div>
        )}

        {/* 오버레이 그라디언트 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.92) 100%)',
        }} />

        {/* 히어로 콘텐츠 */}
        <div style={{ position: 'relative', width: '100%', padding: '0 32px 0', zIndex: 1 }}>
          {/* 아바타 */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', marginBottom: 20,
            background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff',
            border: '2.5px solid rgba(255,255,255,0.25)', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            {member?.avatarUrl
              ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (member?.name?.charAt(0) ?? '?')}
          </div>

          {/* 이름 */}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900,
            color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10,
          }}>
            {member?.name ?? profileName}
          </h1>

          {/* @handle + 전문 분야 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
              @{profileName}
            </span>
            {joinYear && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>· Since {joinYear}</span>}
            {member?.location && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>· 📍 {member.location}</span>}
            {specialties.map(sp => (
              <span key={sp} style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)',
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>{sp}</span>
            ))}
          </div>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 0 }}>
            {member?.websiteUrl && (
              <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 18px', borderRadius: 24,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
                transition: 'background 0.2s',
              }}>🔗 웹사이트</a>
            )}
            {member?.instagramId && (
              <a href={`https://instagram.com/${member.instagramId}`} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 18px', borderRadius: 24,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
              }}>@ Instagram</a>
            )}
            {user?.id && !isOwnPage && (
              <button onClick={handleFollow} disabled={followLoading} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 22px', borderRadius: 24, fontSize: 13, fontWeight: 700,
                border: following ? '1px solid rgba(255,255,255,0.2)' : 'none',
                background: following ? 'rgba(255,255,255,0.1)' : '#5b6ef5',
                color: '#fff', cursor: followLoading ? 'not-allowed' : 'pointer',
                opacity: followLoading ? 0.7 : 1, backdropFilter: 'blur(8px)',
              }}>
                {following ? '✓ 팔로잉' : '+ 팔로우'}
              </button>
            )}
            <button
              onClick={() => navigate(`/inquiry/${profileName}?memberId=${member?.id ?? ''}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 22px', borderRadius: 24, fontSize: 13, fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,110,245,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >✉ 촬영 문의하기</button>
            <button
              onClick={() => navigate(`/portfolio/${profileName}/slideshow`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 24, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#e8e8f0', cursor: 'pointer', backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >▶ 슬라이드쇼</button>
          </div>
        </div>

        {/* Stats Bar (hero 하단 오버레이) */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'center', gap: 0,
        }}>
          {[
            { value: photoCount, label: '작품' },
            { value: followerCount, label: '팔로워', onClick: () => handleOpenFollowModal('followers') },
            { value: followingCount, label: '팔로잉', onClick: () => handleOpenFollowModal('following') },
            { value: totalLikes, label: '총 좋아요' },
            ...(series.length > 0 ? [{ value: series.length, label: '시리즈' }] : []),
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              onClick={stat.onClick}
              style={{
                flex: 1, maxWidth: 160, padding: '14px 0', textAlign: 'center',
                cursor: stat.onClick ? 'pointer' : 'default',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
              onMouseEnter={e => { if (stat.onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BIO SECTION ═══════════════════════════════════════ */}
      {member?.bio && (
        <div style={{
          maxWidth: 640, margin: '0 auto', padding: '52px 32px 40px',
          textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{
            fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)',
            fontStyle: 'italic', wordBreak: 'keep-all',
          }}>"{member.bio}"</p>
        </div>
      )}

      {/* ══ CATEGORY FILTER (sticky) ══════════════════════════ */}
      {availableMoods.length > 0 && (
        <div
          ref={filterBarRef}
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 20px',
            display: 'flex', gap: 6, overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <button
            onClick={() => setMoodFilter('')}
            style={{
              flexShrink: 0, padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: !moodFilter ? '1.5px solid #5b6ef5' : '1.5px solid rgba(255,255,255,0.1)',
              background: !moodFilter ? 'rgba(91,110,245,0.2)' : 'transparent',
              color: !moodFilter ? '#a0a0ff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >전체 {photos.length}</button>

          {availableMoods.map(mood => {
            const md = MOOD_COLORS[mood];
            if (!md) return null;
            const active = moodFilter === mood;
            const count = photos.filter(p => p.colorMood === mood).length;
            return (
              <button
                key={mood}
                onClick={() => setMoodFilter(active ? '' : mood)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${active ? md.dot : 'rgba(255,255,255,0.1)'}`,
                  background: active ? `${md.dot}22` : 'transparent',
                  color: active ? md.dot : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: md.dot, display: 'inline-block' }} />
                {md.label} {count}
              </button>
            );
          })}
        </div>
      )}

      {/* ══ GALLERY ═══════════════════════════════════════════ */}
      <style>{`
        .portfolio-masonry { columns: 4 220px; column-gap: 4px; }
        @media (max-width: 900px) { .portfolio-masonry { columns: 3; } }
        @media (max-width: 600px) { .portfolio-masonry { columns: 2; } }
      `}</style>

      {filteredPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
          {moodFilter ? '해당 분위기의 작품이 없습니다.' : '아직 등록된 작품이 없습니다.'}
        </div>
      ) : isMagazine ? (
        <div style={{ padding: '4px' }}>
          <MagazineGrid photos={filteredPhotos} onPhotoClick={id => navigate(`/photo/${id}`)} />
        </div>
      ) : (
        <div className="portfolio-masonry" style={{ padding: '4px 4px' }}>
          {filteredPhotos.map(photo => (
            <MasonryPhoto key={photo.id} photo={photo} onClick={id => navigate(`/photo/${id}`)} />
          ))}
        </div>
      )}

      {/* ══ SERIES SECTION ════════════════════════════════════ */}
      {series.length > 0 && (
        <div style={{ padding: '60px 0 48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                컬렉션 · {series.length}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px',
            scrollbarWidth: 'none',
          }}>
            {series.map(s => (
              <SeriesScrollCard
                key={s.id}
                series={s}
                onPhotoClick={id => navigate(`/photo/${id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══ FOOTER CTA ════════════════════════════════════════ */}
      <div style={{
        padding: '64px 24px 48px', textAlign: 'center',
        background: 'linear-gradient(180deg, transparent 0%, rgba(18,18,42,0.4) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
          Get in Touch
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: '-0.01em' }}>
          함께 작업하고 싶으신가요?
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 28, lineHeight: 1.7 }}>
          촬영 의뢰, 협업 제안, 작품 구매 문의를 보내주세요.
        </p>
        <button
          onClick={() => navigate(`/inquiry/${profileName}?memberId=${member?.id ?? ''}`)}
          style={{
            padding: '14px 36px', borderRadius: 28, fontSize: 14, fontWeight: 700,
            border: 'none', background: '#5b6ef5', color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(91,110,245,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,110,245,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(91,110,245,0.4)';
          }}
        >
          ✉ 촬영 문의하기
        </button>
        <div style={{ marginTop: 40, fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.08em' }}>
          ✦ Happiness — 포트폴리오 갤러리
        </div>
      </div>

      {/* 팔로워/팔로잉 모달 */}
      {followModal && (
        <FollowListModal
          title={followModal === 'followers' ? `팔로워 ${followerCount}명` : `팔로잉 ${followingCount}명`}
          members={followModalMembers}
          loading={loadingModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  );
}
