import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import apiClient from '../api/apiClient';
import { followApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function PhotoCard({ photo, onClick }) {
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  return (
    <div
      onClick={() => onClick(photo.id)}
      style={{
        background: '#1a1a2e',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
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

function SeriesCard({ series, onClick }) {
  return (
    <div
      onClick={() => onClick(series)}
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
          }}>
            ✦
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.6)', borderRadius: 8,
          padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#fff',
        }}>
          {series.photoCount ?? 0}장
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
  );
}

export default function PortfolioPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('photos');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(`/portfolio/${profileName}`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.status === 404
            ? '포트폴리오를 찾을 수 없습니다.'
            : '불러오는데 실패했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileName]);

  useEffect(() => {
    if (!data?.member?.id) return;
    const memberId = data.member.id;
    followApi.getCount(memberId).then(res => {
      setFollowerCount(res?.data?.followerCount ?? 0);
    }).catch(() => {});
    if (user?.id && user.id !== memberId) {
      followApi.isFollowing(user.id, memberId).then(res => {
        setFollowing(res?.data?.following ?? false);
      }).catch(() => {});
    }
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #1e1e3a', borderTopColor: '#5b6ef5',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a18',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <div style={{ color: '#9090b0', fontSize: 16 }}>{error}</div>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer',
          }}
        >
          로그인하기
        </button>
      </div>
    );
  }

  const { member, photos = [], photoCount = 0, series = [] } = data || {};
  const joinYear = member?.createdAt ? new Date(member.createdAt).getFullYear() : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', color: '#e8e8f0' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #12122a 0%, #0a0a18 100%)',
        padding: '60px 24px 48px',
        textAlign: 'center',
        borderBottom: '1px solid #1e1e3a',
      }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: '#fff',
          boxShadow: '0 6px 32px rgba(91,110,245,0.4)',
        }}>
          {member?.name?.charAt(0) ?? '?'}
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          {member?.name ?? profileName}
        </h1>

        <div style={{ color: '#6060a0', fontSize: 14, marginBottom: 16 }}>
          @{profileName}
          {joinYear && <span style={{ marginLeft: 12 }}>Since {joinYear}</span>}
        </div>

        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{photoCount}</div>
            <div style={{ fontSize: 12, color: '#6060a0' }}>작품</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{followerCount}</div>
            <div style={{ fontSize: 12, color: '#6060a0' }}>팔로워</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{series.length}</div>
            <div style={{ fontSize: 12, color: '#6060a0' }}>시리즈</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {member?.instagramId && (
            <a
              href={`https://instagram.com/${member.instagramId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 20,
                border: '1px solid #2e2e50', background: '#12122a',
                color: '#9090cc', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              @ Instagram
            </a>
          )}
          {user?.id && user.id !== member?.id && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 22px', borderRadius: 20,
                border: following ? '1px solid #2e2e50' : 'none',
                background: following ? '#12122a' : '#5b6ef5',
                color: following ? '#9090cc' : '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: followLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', opacity: followLoading ? 0.7 : 1,
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
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4458e0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#5b6ef5'; }}
          >
            ✉ 촬영 문의하기
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #1e1e3a', marginBottom: 28 }}>
          {[
            { key: 'photos', label: `작품 ${photoCount}` },
            { key: 'series', label: `시리즈 ${series.length}` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                color: activeTab === tab.key ? '#a0a0ff' : '#6060a0',
                borderBottom: `2px solid ${activeTab === tab.key ? '#5b6ef5' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 작품 탭 */}
        {activeTab === 'photos' && (
          photos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6060a0', padding: '60px 0', fontSize: 15 }}>
              아직 등록된 작품이 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {photos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onClick={(id) => navigate(`/photo/${id}`)} />
              ))}
            </div>
          )
        )}

        {/* 시리즈 탭 */}
        {activeTab === 'series' && (
          series.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6060a0', padding: '60px 0', fontSize: 15 }}>
              아직 등록된 시리즈가 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {series.map(s => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  onClick={() => {}}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a3a60', fontSize: 12 }}>
        ✦ Happiness — 포트폴리오 갤러리
      </div>
    </div>
  );
}
