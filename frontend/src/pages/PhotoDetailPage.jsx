import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import GenreBadge, { SubGenreBadges } from '../components/photo/GenreBadge';
import CommentsSection from '../components/photo/CommentsSection';
import ColorPalette from '../components/photo/ColorPalette';
import PhotoViewer from '../components/photo/PhotoViewer';
import PhotoNavigation from '../components/photo/PhotoNavigation';
import ShareButton from '../components/photo/ShareButton';
import RelatedPhotos from '../components/photo/RelatedPhotos';
import useColorExtraction from '../hooks/useColorExtraction';

function buildAdjSummary(adj, effects) {
  const items = [];
  if (!adj && !effects) return items;
  const a = adj || {};
  const e = effects || {};
  const fmt = (v) => (v > 0 ? `+${v}` : `${v}`);
  if (a.exposure)    items.push(`노출 ${fmt(Number(a.exposure).toFixed(2))}`);
  if (a.contrast)    items.push(`대비 ${fmt(a.contrast)}`);
  if (a.highlights)  items.push(`밝은영역 ${fmt(a.highlights)}`);
  if (a.shadows)     items.push(`어두운영역 ${fmt(a.shadows)}`);
  if (e.vignette)    items.push(`비네팅 ${fmt(e.vignette)}`);
  if (e.grainAmount) items.push(`그레인 ${e.grainAmount}`);
  if (e.clarity)     items.push(`부분대비 ${fmt(e.clarity)}`);
  return items;
}

export default function PhotoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 전체화면 뷰어
  const [viewerOpen, setViewerOpen] = useState(false);

  // 같은 작가 사진 목록 (네비게이션 + 관련사진)
  const [photoList, setPhotoList] = useState([]);
  const [relatedPhotos, setRelatedPhotos] = useState([]);

  // 컬러 팔레트
  const { colors: palette, loading: paletteLoading } = useColorExtraction(
    photo?.imageUrl || photo?.image
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await photoApi.getOne(id);
        if (!cancelled) {
          const found = res?.data ?? res;
          if (found) {
            setPhoto(found);
            setLikeCount(found.likeCount ?? 0);
          } else {
            setError('사진을 찾을 수 없습니다.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.status === 404
            ? '사진을 찾을 수 없습니다.'
            : '사진을 불러오는데 실패했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // 같은 작가 사진 목록 로드 (네비게이션 + 관련 사진용)
  useEffect(() => {
    if (!photo) return;
    const memberId = photo.memberId || photo.member?.id;
    if (!memberId) return;
    photoApi.getByMember(memberId)
      .then(res => {
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        setPhotoList(list);
        setRelatedPhotos(list.filter(p => String(p.id) !== String(id)).slice(0, 6));
      })
      .catch(() => {});
  }, [photo, id]);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    if (user?.id) {
      if (next) photoApi.likePhoto(id, user.id).catch(() => {});
      else photoApi.unlikePhoto(id, user.id).catch(() => {});
    }
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    if (user?.id) {
      if (next) photoApi.savePhoto(id, user.id).catch(() => {});
      else photoApi.unsavePhoto(id, user.id).catch(() => {});
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await photoApi.remove(id);
      navigate('/');
    } catch {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  const handleNavigate = useCallback((targetId) => {
    navigate(`/photo/${targetId}`);
  }, [navigate]);

  // 전체화면 뷰어 네비게이션
  const viewerIdx  = photoList.findIndex(p => String(p.id) === String(id));
  const viewerPrev = viewerIdx > 0 ? photoList[viewerIdx - 1] : null;
  const viewerNext = viewerIdx !== -1 && viewerIdx < photoList.length - 1 ? photoList[viewerIdx + 1] : null;

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${COLORS.border}`,
          borderTopColor: COLORS.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 12 }}>
        <div style={{ color: COLORS.danger, fontSize: 16 }}>{error || '사진을 찾을 수 없습니다.'}</div>
        <button onClick={() => navigate('/')} style={primaryBtn}>갤러리로 돌아가기</button>
      </div>
    );
  }

  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const authorName = photo.memberName || photo.member?.name || '익명';
  const authorAvatar = photo.memberAvatarUrl || photo.member?.avatarUrl;
  const createdAt = photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('ko-KR') : '';
  const adjSummary = buildAdjSummary(photo.adjustments, photo.effects);
  const isOwner = user?.id && (photo.memberId === user.id || photo.member?.id === user.id);

  const imageSection = (
    <div style={{
      flex: isMobile ? 'none' : '0 0 58%',
      background: '#0e0e0e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: isMobile ? 280 : '100%',
      position: 'relative',
    }}>
      <img
        src={photo.imageUrl || photo.image}
        alt={photo.title}
        onClick={() => setViewerOpen(true)}
        style={{
          maxWidth: '100%', maxHeight: isMobile ? 400 : '90vh',
          objectFit: 'contain', display: 'block',
          cursor: 'zoom-in',
        }}
      />
      {/* 이전/다음 네비게이션 오버레이 */}
      <PhotoNavigation
        currentId={id}
        photoList={photoList}
        onNavigate={handleNavigate}
      />
      {/* 전체화면 힌트 */}
      <div style={{
        position: 'absolute', bottom: 10, right: 12,
        fontSize: 10, color: 'rgba(255,255,255,0.35)',
        background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '3px 7px',
        pointerEvents: 'none',
      }}>
        클릭하여 전체화면
      </div>
    </div>
  );

  const infoSection = (
    <div style={{
      flex: 1, padding: isMobile ? '20px 20px 32px' : '28px 28px',
      overflowY: 'auto', background: COLORS.surface,
    }}>
      {/* 작가 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden',
        }}>
          {authorAvatar
            ? <img src={authorAvatar} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : authorName.charAt(0)
          }
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{authorName}</div>
          {createdAt && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{createdAt}</div>}
        </div>
        {isOwner && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => navigate(`/photo/${id}/edit`)} style={miniBtn}>수정</button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...miniBtn, color: COLORS.danger }}>
              {deleting ? '...' : '삭제'}
            </button>
          </div>
        )}
      </div>

      {/* 제목 */}
      <h1 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, marginBottom: 8, lineHeight: 1.3 }}>
        {photo.title || '제목 없음'}
      </h1>

      {/* 장르 + 무드 배지 */}
      {(photo.genre || mood) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {photo.genre && <GenreBadge genre={photo.genre} />}
          {photo.subGenres && <SubGenreBadges subGenres={photo.subGenres} />}
          {mood && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: mood.bg, padding: '4px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 700,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
              {mood.label}
            </span>
          )}
        </div>
      )}

      {/* 설명 */}
      {photo.description && (
        <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7, marginBottom: 18 }}>
          {photo.description}
        </p>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={handleLike} style={{
          flex: 1, minWidth: 80, padding: '10px', borderRadius: 10,
          border: `1.5px solid ${liked ? COLORS.danger : COLORS.border}`,
          background: liked ? '#fff0f0' : COLORS.surface,
          color: liked ? COLORS.danger : COLORS.textSecondary,
          cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
        }}>
          {liked ? '♥' : '♡'} 좋아요 {likeCount > 0 && likeCount}
        </button>
        <button onClick={handleSave} style={{
          flex: 1, minWidth: 80, padding: '10px', borderRadius: 10,
          border: `1.5px solid ${saved ? COLORS.primary : COLORS.border}`,
          background: saved ? COLORS.primaryLight : COLORS.surface,
          color: saved ? COLORS.primary : COLORS.textSecondary,
          cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
        }}>
          {saved ? '★' : '☆'} 저장 {photo.saveCount > 0 && photo.saveCount}
        </button>
        <ShareButton url={window.location.href} title={photo.title} theme="light" />
        <button
          onClick={() => window.print()}
          style={{
            height: 40, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${COLORS.border}`, background: '#fff',
            color: COLORS.textSecondary, cursor: 'pointer',
          }}
          className="no-print"
        >🖨️</button>
      </div>

      {/* 태그 */}
      {photo.tags && photo.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {photo.tags.map(tag => (
            <span key={tag.id ?? tag} style={{
              padding: '3px 10px', borderRadius: 20,
              background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              fontSize: 12, color: COLORS.textSecondary, fontWeight: 500,
            }}>
              #{tag.name ?? tag}
            </span>
          ))}
        </div>
      )}

      {/* 대표 컬러 팔레트 */}
      <div style={{ marginBottom: 20 }}>
        <ColorPalette colors={palette} loading={paletteLoading} theme="light" />
      </div>

      {/* 보정 설정 */}
      {adjSummary.length > 0 && (
        <div style={{
          background: '#12122a', borderRadius: 10, padding: '12px 14px',
          border: '1px solid #1e1e3a', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            보정 설정
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {adjSummary.map((item, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: 6,
                background: '#1e1e3a', color: '#9090cc', fontSize: 11, fontWeight: 600,
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 관련 사진 */}
      {relatedPhotos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <RelatedPhotos photos={relatedPhotos} onPhotoClick={handleNavigate} />
        </div>
      )}

      {/* 댓글 */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 20 }}>
        <CommentsSection photoId={id} currentUser={user} theme="light" />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: isMobile ? COLORS.bg : '#0e0e0e' }}>
      <style>{`
        @media print {
          header, nav, .no-print, .comments-section { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* 뒤로가기 */}
      <button
        onClick={() => navigate(-1)}
        className="no-print"
        style={{
          position: 'fixed', top: isMobile ? 12 : 18, left: 16, zIndex: 100,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: 'none', borderRadius: 20, padding: '7px 14px',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >← 뒤로가기</button>

      {isMobile ? (
        <div style={{ paddingTop: 0 }}>
          {imageSection}
          {infoSection}
        </div>
      ) : (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', maxHeight: '92vh', marginTop: 60 }}>
          {imageSection}
          {infoSection}
        </div>
      )}

      {/* 전체화면 뷰어 */}
      <PhotoViewer
        isOpen={viewerOpen}
        imageUrl={photo.imageUrl || photo.image}
        title={photo.title}
        onClose={() => setViewerOpen(false)}
        onPrev={viewerPrev ? () => { setViewerOpen(false); handleNavigate(viewerPrev.id); } : undefined}
        onNext={viewerNext ? () => { setViewerOpen(false); handleNavigate(viewerNext.id); } : undefined}
        hasPrev={!!viewerPrev}
        hasNext={!!viewerNext}
      />
    </div>
  );
}

const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '70vh',
};
const primaryBtn = {
  padding: '10px 20px', background: COLORS.primary, color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const miniBtn = {
  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.textSecondary, cursor: 'pointer',
};
