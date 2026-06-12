import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import apiClient from '../api/apiClient';
import { followApi, seriesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ── PhotoCard ──────────────────────────────────────────────────────────

function PhotoCard({ photo, onClick }) {
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  return (
    <div
      onClick={() => onClick(photo.id)}
      style={{
        background: '#1a1a2e', borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.4)';
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#0e0e0e' }}>
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={photo.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        {mood && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            background: mood.bg, padding: '3px 9px', borderRadius: 10,
            fontSize: 11, fontWeight: 700,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
            {mood.label}
          </div>
        )}
        {photo.dominantColor && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 14, height: 14, borderRadius: '50%',
            background: photo.dominantColor,
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }} />
        )}
      </div>
      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0', marginBottom: 4, lineHeight: 1.4 }}>
          {photo.title || '제목 없음'}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#6060a0' }}>{photo.imageRatio}</span>
          <span style={{ fontSize: 12, color: '#6060a0', fontWeight: 600 }}>♡ {photo.likesCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// ── SeriesCard (클릭 시 인라인 사진 펼치기) ───────────────────────────

function SeriesCard({ series, expanded, onToggle, onPhotoClick }) {
  const [detail, setDetail]           = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleToggle = async () => {
    onToggle(series.id);
    if (!expanded && !detail) {
      setLoadingDetail(true);
      try {
        const res = await seriesApi.getOne(series.id);
        setDetail(res?.data ?? res);
      } catch {
        setDetail({ photos: [] });
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  return (
    <div style={{
      background: '#1a1a2e', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(0,0,0,0.4)', transition: 'box-shadow 0.2s',
    }}>
      {/* 헤더 */}
      <div
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.parentElement.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.parentElement.style.boxShadow = '0 2px 16px rgba(0,0,0,0.4)'; }}
      >
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0e0e0e', overflow: 'hidden' }}>
          {series.coverImageUrl ? (
            <img
              src={series.coverImageUrl} alt={series.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#4040a0',
            }}>✦</div>
          )}
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.6)', borderRadius: 8,
            padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {series.photoCount ?? 0}장
          </div>
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff',
          }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f0', marginBottom: 4 }}>
            {series.title}
          </h3>
          {series.description && (
            <p style={{
              fontSize: 12, color: '#6060a0', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {series.description}
            </p>
          )}
        </div>
      </div>

      {/* 인라인 사진 그리드 */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1e1e3a', padding: 14 }}>
          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#5555aa', fontSize: 12 }}>
              불러오는 중...
            </div>
          ) : (detail?.photos?.length > 0) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {detail.photos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => onPhotoClick(photo.id)}
                  style={{
                    aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                    cursor: 'pointer', background: '#0e0e0e',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#5555aa', padding: '16px 0' }}>
              등록된 사진이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FollowListModal ────────────────────────────────────────────────────

function FollowListModal({ title, members, loading, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#12122a', borderRadius: 16, padding: '20px',
          width: '90%', maxWidth: 360, maxHeight: '70vh',
          overflow: 'auto', border: '1px solid #2a2a50',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#eeeeff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090cc', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#5555aa', fontSize: 13 }}>불러오는 중...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#5555aa', padding: '24px 0', fontSize: 13 }}>목록이 없습니다.</div>
        ) : (
          members.map(m => (
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
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { profileName } = useParams();
  const navigate        = useNavigate();
  const { user }        = useAuth();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [activeTab, setActiveTab]   = useState('photos');
  const [moodFilter, setMoodFilter] = useState('');
  const [expandedSeriesId, setExpandedSeriesId] = useState(null);

  const [following, setFollowing]         = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [followModal, setFollowModal]           = useState(null); // 'followers' | 'following'
  const [followModalMembers, setFollowModalMembers] = useState([]);
  const [loadingModal, setLoadingModal]         = useState(false);

  // ── 포트폴리오 로드 ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setIsPrivate(false);
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

  // ── 팔로우 여부 확인 ─────────────────────────────────────────────────
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
      else      await followApi.follow(user.id, memberId);
    } catch {
      setFollowing(prev);
      setFollowerCount(c => c + (prev ? 1 : -1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenFollowModal = async (type) => {
    if (!data?.member?.id) return;
    setFollowModal(type);
    setFollowModalMembers([]);
    setLoadingModal(true);
    try {
      const res = type === 'followers'
        ? await followApi.getFollowers(data.member.id)
        : await followApi.getFollowing(data.member.id);
      const list = res?.data ?? res ?? [];
      setFollowModalMembers(Array.isArray(list) ? list : []);
    } catch {
      setFollowModalMembers([]);
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1e1e3a', borderTopColor: '#5b6ef5', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── 비공개 ──────────────────────────────────────────────────────────
  if (isPrivate) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ color: '#eeeeff', fontSize: 18, fontWeight: 700 }}>비공개 포트폴리오</div>
        <div style={{ color: '#6060a0', fontSize: 14 }}>이 작가의 포트폴리오는 비공개 상태입니다.</div>
        <button onClick={() => navigate(-1)}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >돌아가기</button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ color: '#9090b0', fontSize: 16 }}>{error}</div>
        <button onClick={() => navigate('/login')}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >로그인하기</button>
      </div>
    );
  }

  const {
    member, photos = [], photoCount = 0, series = [],
    followingCount = 0, totalLikes = 0,
  } = data || {};

  const joinYear    = member?.createdAt ? new Date(member.createdAt).getFullYear() : null;
  const specialties = member?.specialties ? member.specialties.split(',').map(s => s.trim()).filter(Boolean) : [];

  const availableMoods  = [...new Set(photos.map(p => p.colorMood).filter(Boolean))];
  const filteredPhotos  = moodFilter ? photos.filter(p => p.colorMood === moodFilter) : photos;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', color: '#e8e8f0' }}>

      {/* ── 커버 이미지 ─────────────────────────────────────────── */}
      {member?.coverUrl && (
        <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
          <img src={member.coverUrl} alt="커버"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,10,24,0) 40%, rgba(10,10,24,1) 100%)',
          }} />
        </div>
      )}

      {/* ── Hero 프로필 ────────────────────────────────────────── */}
      <div style={{
        background: member?.coverUrl ? 'transparent' : 'linear-gradient(180deg, #12122a 0%, #0a0a18 100%)',
        padding: member?.coverUrl ? '0 24px 40px' : '60px 24px 40px',
        textAlign: 'center',
        borderBottom: '1px solid #1e1e3a',
        marginTop: member?.coverUrl ? -56 : 0,
        position: 'relative',
      }}>
        {/* 아바타 */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, fontWeight: 700, color: '#fff',
          boxShadow: '0 6px 32px rgba(91,110,245,0.5)',
          border: '3px solid #0a0a18', overflow: 'hidden',
        }}>
          {member?.avatarUrl
            ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (member?.name?.charAt(0) ?? '?')}
        </div>

        {/* 이름 */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {member?.name ?? profileName}
        </h1>

        {/* @handle + Since + Location */}
        <div style={{ color: '#6060a0', fontSize: 13, marginBottom: 10, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>@{profileName}</span>
          {joinYear && <span>Since {joinYear}</span>}
          {member?.location && <span>📍 {member.location}</span>}
        </div>

        {/* bio */}
        {member?.bio && (
          <p style={{ fontSize: 13, color: '#9090c0', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 12px', wordBreak: 'keep-all' }}>
            {member.bio}
          </p>
        )}

        {/* specialties */}
        {specialties.length > 0 && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {specialties.map(sp => (
              <span key={sp} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: '#1a1a3a', color: '#8080cc', border: '1px solid #2a2a50',
              }}>
                {sp}
              </span>
            ))}
          </div>
        )}

        {/* 통계 4종 */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{photoCount}</div>
            <div style={{ fontSize: 11, color: '#6060a0' }}>작품</div>
          </div>
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleOpenFollowModal('followers')}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{followerCount}</div>
            <div style={{ fontSize: 11, color: '#6060a0' }}>팔로워</div>
          </div>
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleOpenFollowModal('following')}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{followingCount}</div>
            <div style={{ fontSize: 11, color: '#6060a0' }}>팔로잉</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{totalLikes}</div>
            <div style={{ fontSize: 11, color: '#6060a0' }}>총 좋아요</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{series.length}</div>
            <div style={{ fontSize: 11, color: '#6060a0' }}>시리즈</div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {member?.websiteUrl && (
            <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 20,
                border: '1px solid #2e2e50', background: '#12122a',
                color: '#9090cc', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >🔗 웹사이트</a>
          )}
          {member?.instagramId && (
            <a href={`https://instagram.com/${member.instagramId}`} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 20,
                border: '1px solid #2e2e50', background: '#12122a',
                color: '#9090cc', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >@ Instagram</a>
          )}
          {user?.id && user.id !== member?.id && (
            <button onClick={handleFollow} disabled={followLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 22px', borderRadius: 20,
                border: following ? '1px solid #2e2e50' : 'none',
                background: following ? '#12122a' : '#5b6ef5',
                color: following ? '#9090cc' : '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: followLoading ? 'not-allowed' : 'pointer',
                opacity: followLoading ? 0.7 : 1,
              }}
            >
              {following ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
          <button
            onClick={() => navigate(`/inquiry/${profileName}?memberId=${member?.id ?? ''}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 22px', borderRadius: 20,
              border: 'none', background: '#5b6ef5',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4458e0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#5b6ef5'; }}
          >✉ 촬영 문의하기</button>
        </div>
      </div>

      {/* ── 탭 + 콘텐츠 ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 48px' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #1e1e3a', marginBottom: 24 }}>
          {[
            { key: 'photos', label: `작품 ${photoCount}` },
            { key: 'series', label: `시리즈 ${series.length}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                color: activeTab === tab.key ? '#a0a0ff' : '#6060a0',
                borderBottom: `2px solid ${activeTab === tab.key ? '#5b6ef5' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* 작품 탭 */}
        {activeTab === 'photos' && (
          <>
            {/* 무드 필터 */}
            {availableMoods.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setMoodFilter('')}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${!moodFilter ? '#5b6ef5' : '#2a2a50'}`,
                    background: !moodFilter ? 'rgba(91,110,245,0.15)' : 'transparent',
                    color: !moodFilter ? '#a0a0ff' : '#6060a0', cursor: 'pointer',
                  }}
                >전체</button>
                {availableMoods.map(mood => {
                  const md = MOOD_COLORS[mood];
                  if (!md) return null;
                  const active = moodFilter === mood;
                  return (
                    <button key={mood} onClick={() => setMoodFilter(active ? '' : mood)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${active ? md.dot : '#2a2a50'}`,
                        background: active ? md.bg : 'transparent',
                        color: active ? COLORS.text : '#6060a0', cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: md.dot, display: 'inline-block' }} />
                      {md.label}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6060a0', padding: '60px 0', fontSize: 15 }}>
                {moodFilter ? '해당 색채 분위기의 작품이 없습니다.' : '아직 등록된 작품이 없습니다.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filteredPhotos.map(photo => (
                  <PhotoCard key={photo.id} photo={photo} onClick={id => navigate(`/photo/${id}`)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 시리즈 탭 */}
        {activeTab === 'series' && (
          series.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6060a0', padding: '60px 0', fontSize: 15 }}>
              아직 등록된 시리즈가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {series.map(s => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  expanded={expandedSeriesId === s.id}
                  onToggle={id => setExpandedSeriesId(prev => prev === id ? null : id)}
                  onPhotoClick={id => navigate(`/photo/${id}`)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#3a3a60', fontSize: 12 }}>
        ✦ Happiness — 포트폴리오 갤러리
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
