export default function FeatureSpread({ photo, supportPhotos = [] }) {
  const subPhotos = supportPhotos.slice(0, 3);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#fff' }}>
      {/* 대표 사진 (60%) */}
      <div style={{ flex: '0 0 60%', position: 'relative', overflow: 'hidden' }}>
        <img
          src={photo.imageUrl}
          alt={photo.title || '대표 사진'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* 대표 제목 오버레이 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)',
          padding: '40px 28px 24px',
        }}>
          <h2 style={{
            margin: '0 0 8px', fontSize: 24, fontWeight: 700,
            color: '#fff', lineHeight: 1.25,
          }}>
            {photo.title}
          </h2>
          {(photo.magazineCaption || photo.description) && (
            <p style={{
              margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {photo.magazineCaption || photo.description}
            </p>
          )}
        </div>
      </div>

      {/* 보조 사진들 (40%) */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {subPhotos.length > 0 ? subPhotos.map((p, i) => (
          <div key={p.id || i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <img
              src={p.imageUrl}
              alt={p.title || `보조 사진 ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '32px 24px', gap: 20,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#5c5c7a', lineHeight: 1.7 }}>
              {photo.description}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#9090b0' }}>
              {photo.authorName && `— ${photo.authorName}`}
            </p>
          </div>
        )}
      </div>

      {/* 판 뱃지 */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.9)', color: '#9090b0', fontSize: 11,
        padding: '4px 10px', borderRadius: 8,
      }}>
        화보판
      </div>
    </div>
  );
}
