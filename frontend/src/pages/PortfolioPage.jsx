import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import apiClient from '../api/apiClient';

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

export default function PortfolioPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const { member, photos = [], photoCount = 0 } = data || {};
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

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{photoCount}</div>
            <div style={{ fontSize: 12, color: '#6060a0' }}>작품</div>
          </div>
        </div>

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
      </div>

      {/* Gallery */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        {photos.length === 0 ? (
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
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={(id) => navigate(`/photo/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a3a60', fontSize: 12 }}>
        ✦ Happiness — 포트폴리오 갤러리
      </div>
    </div>
  );
}
