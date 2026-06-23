export default function EditorialSpread({ photo }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      {/* 메인 이미지 70% */}
      <div style={{ flex: '0 0 70%', position: 'relative', overflow: 'hidden' }}>
        <img
          src={photo.imageUrl}
          alt={photo.title || '사진'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 사이드바 30% */}
      <div style={{
        flex: '0 0 30%', borderLeft: '1px solid #e2e2ee',
        display: 'flex', flexDirection: 'column',
        padding: '32px 24px', background: '#fff', overflowY: 'auto',
      }}>
        {/* 작가 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#eef0ff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, flexShrink: 0,
          }}>
            {photo.authorAvatar
              ? <img src={photo.authorAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : '◎'
            }
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
              {photo.authorName || '작가'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#9090b0' }}>
              {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('ko-KR') : ''}
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e2ee', paddingTop: 20, flex: 1 }}>
          <h3 style={{
            margin: '0 0 14px', fontSize: 18, fontWeight: 700,
            color: '#1a1a2e', lineHeight: 1.3,
          }}>
            {photo.title}
          </h3>

          {(photo.magazineCaption || photo.description) && (
            <p style={{
              margin: '0 0 20px', fontSize: 13, color: '#5c5c7a',
              lineHeight: 1.75, fontStyle: photo.magazineCaption ? 'italic' : 'normal',
            }}>
              {photo.magazineCaption || photo.description}
            </p>
          )}

          {/* 태그 */}
          {photo.tags && photo.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {photo.tags.slice(0, 5).map(tag => (
                <span key={tag.id || tag.memberName} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  background: '#eef0ff', color: '#5b6ef5',
                }}>
                  #{tag.memberName || tag}
                </span>
              ))}
            </div>
          )}

          {/* 좋아요/저장 수 */}
          <div style={{ display: 'flex', gap: 16, color: '#9090b0', fontSize: 13 }}>
            <span>♡ {photo.likesCount || 0}</span>
            <span>⊛ {photo.savesCount || 0}</span>
          </div>
        </div>

        {/* 판 뱃지 */}
        <div style={{
          marginTop: 'auto', paddingTop: 16,
          fontSize: 11, color: '#9090b0', textAlign: 'right',
        }}>
          편집판
        </div>
      </div>
    </div>
  );
}
