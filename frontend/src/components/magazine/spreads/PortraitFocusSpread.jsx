export default function PortraitFocusSpread({ photo }) {
  const bgColor = photo.dominantColor ? photo.dominantColor + '22' : '#f5f5fa';

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: bgColor, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px',
    }}>
      {/* 좌우 여백 → 중앙 이미지 (70%) */}
      <div style={{
        width: '70%', maxWidth: 480, position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <img
          src={photo.imageUrl}
          alt={photo.title || '사진'}
          style={{
            width: '100%', display: 'block',
            aspectRatio: '3 / 4', objectFit: 'cover',
          }}
        />
      </div>

      {/* 제목·캡션 (중앙 정렬) */}
      <div style={{ textAlign: 'center', marginTop: 28, maxWidth: 400 }}>
        <h2 style={{
          margin: '0 0 10px', fontSize: 20, fontWeight: 700,
          color: '#1a1a2e', letterSpacing: '-0.2px',
        }}>
          {photo.title}
        </h2>
        {(photo.magazineCaption || photo.description) && (
          <p style={{
            margin: 0, fontSize: 13, color: '#5c5c7a',
            lineHeight: 1.7, fontStyle: 'italic',
          }}>
            {photo.magazineCaption || photo.description}
          </p>
        )}
        {photo.authorName && (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9090b0' }}>
            — {photo.authorName}
          </p>
        )}
      </div>

      {/* 판 뱃지 */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
        color: '#9090b0', fontSize: 11, padding: '4px 10px', borderRadius: 8,
      }}>
        인물판
      </div>
    </div>
  );
}
