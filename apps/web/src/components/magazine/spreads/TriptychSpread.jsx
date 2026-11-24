export default function TriptychSpread({ photo, supportPhotos = [] }) {
  const photos = [photo, ...supportPhotos.slice(0, 2)].filter(Boolean);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* 공통 제목 */}
      {photo.title && (
        <div style={{
          padding: '24px 32px 16px', textAlign: 'center',
          fontSize: 14, fontWeight: 600, letterSpacing: '3px',
          textTransform: 'uppercase', color: '#5c5c7a',
        }}>
          {photo.title}
        </div>
      )}

      {/* 3장 가로 배치 */}
      <div style={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden' }}>
        {photos.map((p, i) => (
          <div key={p.id || i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <img
              src={p.imageUrl}
              alt={p.title || `사진 ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* 프레임 번호 */}
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11,
              padding: '2px 8px', borderRadius: 4,
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
          </div>
        ))}
        {/* 빈 슬롯 채우기 */}
        {photos.length < 3 && Array(3 - photos.length).fill(null).map((_, i) => (
          <div key={`empty-${i}`} style={{
            flex: 1, background: '#f5f5fa', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#e2e2ee', fontSize: 32,
          }}>
            ⊞
          </div>
        ))}
      </div>

      {/* 판 뱃지 */}
      <div style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: '#9090b0' }}>
        3면판
      </div>
    </div>
  );
}
