export default function SplitSpread({ photo }) {
  const imageOnRight = photo.imageRight === true;

  const imgPanel = (
    <div style={{ flex: '0 0 58%', position: 'relative', overflow: 'hidden' }}>
      <img
        src={photo.imageUrl}
        alt={photo.title || '사진'}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );

  const textPanel = (
    <div style={{
      flex: '0 0 42%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '48px 40px',
      background: '#fff',
    }}>
      <p style={{
        margin: '0 0 12px', fontSize: 11, fontWeight: 600, letterSpacing: '2px',
        textTransform: 'uppercase', color: '#5b6ef5',
      }}>
        {photo.genre ? photo.genre : 'PHOTOGRAPHY'}
      </p>
      <h2 style={{
        margin: '0 0 20px', fontSize: 28, fontWeight: 700, color: '#1a1a2e',
        lineHeight: 1.25, letterSpacing: '-0.3px',
      }}>
        {photo.title}
      </h2>
      {(photo.magazineCaption || photo.description) && (
        <p style={{
          margin: '0 0 28px', fontSize: 15, color: '#5c5c7a', lineHeight: 1.8,
          display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {photo.magazineCaption || photo.description}
        </p>
      )}
      <div style={{ borderTop: '1px solid #e2e2ee', paddingTop: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#9090b0' }}>
          {photo.authorName || ''}
          {photo.createdAt ? ' · ' + new Date(photo.createdAt).toLocaleDateString('ko-KR') : ''}
        </p>
      </div>

      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: '#f5f5fa', color: '#9090b0', fontSize: 11,
        padding: '4px 10px', borderRadius: 8, letterSpacing: '0.5px',
      }}>
        2분할판
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%', position: 'relative',
      flexDirection: imageOnRight ? 'row-reverse' : 'row',
    }}>
      {imgPanel}
      {textPanel}
    </div>
  );
}
