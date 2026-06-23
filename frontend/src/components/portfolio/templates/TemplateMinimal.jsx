import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TemplateMinimal({ member, photos, series, profileName, onInquiry }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const specialties = member?.specialties
    ? member.specialties.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const profileNameDisplay = member?.profileName || profileName || '';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      color: '#1a1a1a',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '80px 32px 60px',
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 300,
          letterSpacing: '-0.03em',
          color: '#111',
          margin: 0,
          marginBottom: 16,
        }}>
          {(member?.name || profileNameDisplay).toLowerCase()}.
        </h1>

        {member?.bio && (
          <p style={{
            fontSize: 15,
            color: '#555',
            lineHeight: 1.7,
            maxWidth: 480,
            marginBottom: 12,
          }}>
            {member.bio}
          </p>
        )}

        {(specialties.length > 0 || member?.location) && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
            {specialties.join(' · ')}
            {member?.location && specialties.length > 0 && ' · '}
            {member?.location}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {member?.websiteUrl && (
            <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#333', textDecoration: 'none', borderBottom: '1px solid #ccc', paddingBottom: 2 }}>
              website
            </a>
          )}
          {member?.instagramId && (
            <a href={`https://instagram.com/${member.instagramId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#333', textDecoration: 'none', borderBottom: '1px solid #ccc', paddingBottom: 2 }}>
              @{member.instagramId}
            </a>
          )}
          {profileNameDisplay && (
            <button
              onClick={() => onInquiry ? onInquiry() : navigate(`/inquiry/${profileNameDisplay}?memberId=${member?.id ?? ''}`)}
              style={{ fontSize: 13, color: '#333', background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 14px', cursor: 'pointer' }}
            >
              연락하기 →
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ height: 1, background: '#e8e8e8' }} />
      </div>

      {/* Photo Grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 32px' }}>
        {photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb', fontSize: 14 }}>
            아직 등록된 작품이 없습니다.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
          }}>
            <style>{`
              @media (max-width: 600px) {
                .minimal-grid { grid-template-columns: repeat(2, 1fr) !important; }
              }
            `}</style>
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="minimal-grid-item"
                onMouseEnter={() => setHovered(photo.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/photo/${photo.id}`)}
                style={{
                  aspectRatio: '1',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  background: '#f0f0f0',
                }}
              >
                <img
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.title || '사진'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.4s ease',
                    transform: hovered === photo.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '12px',
                  opacity: hovered === photo.id ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                }}>
                  {photo.title && (
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, lineHeight: 1.3 }}>
                      {photo.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ height: 1, background: '#e8e8e8' }} />
      </div>

      {/* Footer CTA */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 32px 80px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>get in touch</div>
        <button
          onClick={() => navigate(`/inquiry/${profileNameDisplay}?memberId=${member?.id ?? ''}`)}
          style={{
            fontSize: 14,
            color: '#111',
            background: 'none',
            border: '1px solid #111',
            borderRadius: 4,
            padding: '10px 28px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#111'; }}
        >
          Let's work together →
        </button>
        <div style={{ marginTop: 48, fontSize: 11, color: '#ccc', letterSpacing: '0.1em' }}>
          ✦ HAPPINESS PORTFOLIO
        </div>
      </div>
    </div>
  );
}
