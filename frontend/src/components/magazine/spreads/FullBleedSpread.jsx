export default function FullBleedSpread({ photo }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      <img
        src={photo.imageUrl}
        alt={photo.title || '사진'}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        padding: '60px 48px 48px',
      }}>
        <h1 style={{
          margin: 0, fontSize: 36, fontWeight: 700, color: '#fff',
          letterSpacing: '-0.5px', lineHeight: 1.2,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {photo.title}
        </h1>
        {photo.magazineCaption && (
          <p style={{
            margin: '12px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.6, maxWidth: 600,
          }}>
            {photo.magazineCaption}
          </p>
        )}
        {photo.description && !photo.magazineCaption && (
          <p style={{
            margin: '12px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6, maxWidth: 600,
          }}>
            {photo.description}
          </p>
        )}
        <p style={{ margin: '16px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          {photo.authorName || ''}{photo.createdAt ? ' · ' + new Date(photo.createdAt).toLocaleDateString('ko-KR') : ''}
        </p>
      </div>

      {/* 판 뱃지 */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
        color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 500,
        padding: '4px 10px', borderRadius: 8, letterSpacing: '0.5px',
      }}>
        전면판
      </div>
    </div>
  );
}
