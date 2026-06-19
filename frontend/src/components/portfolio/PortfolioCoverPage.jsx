import React from 'react';

export default function PortfolioCoverPage({
  coverImageUrl,
  artistName,
  profileName,
  bio,
  specialties = [],
  photoCount = 0,
  seriesCount = 0,
}) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      {/* 배경 */}
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={artistName}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0a0a18 0%, #12122a 60%, #1e1040 100%)',
        }} />
      )}

      {/* 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: coverImageUrl
          ? 'linear-gradient(rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)'
          : 'none',
      }} />

      {/* 중앙 텍스트 블록 */}
      <div style={{
        position: 'absolute', bottom: '20%', left: '10%', maxWidth: 600,
        animation: 'fadeUp 0.8s ease-out both',
      }}>
        <div style={{
          fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, color: '#fff',
          letterSpacing: '-1px', textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          lineHeight: 1.1,
        }}>
          {artistName}
        </div>
        {profileName && (
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
            @{profileName}
          </div>
        )}
        {bio && (
          <div style={{
            fontSize: 15, color: 'rgba(255,255,255,0.75)', maxWidth: 480,
            marginTop: 14, lineHeight: 1.75,
          }}>
            {bio}
          </div>
        )}
        {specialties.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {specialties.map(sp => (
              <span key={sp} style={{
                height: 24, padding: '0 10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
                fontSize: 12, display: 'inline-flex', alignItems: 'center',
              }}>{sp}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, marginTop: 20, color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
          <span>📸 {photoCount}장</span>
          {seriesCount > 0 && <span>📚 {seriesCount}개 시리즈</span>}
        </div>
      </div>

      {/* 스크롤 힌트 */}
      <div style={{
        position: 'absolute', bottom: 28, right: '20%',
        fontSize: 14, color: 'rgba(255,255,255,0.6)',
        animation: 'blink 1.8s infinite',
      }}>
        사진 보기 →
      </div>
    </div>
  );
}
