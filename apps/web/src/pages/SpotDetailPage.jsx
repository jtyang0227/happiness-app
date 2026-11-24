import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import Button from '../components/common/Button';
import DotEmptyState from '../components/common/DotEmptyState';
import PhotoModal from '../components/photo/PhotoModal';
import SpotFormModal from '../components/spot/SpotFormModal';
import { TimeChip } from '../components/spot/SpotCard';
import { spotApi, spotErrorMessage } from '../services/spotApi';
import { KAKAO_MAP_KEY, kakaoDirectionsUrl, loadKakaoMaps } from '../utils/kakaoMap';
import { applyPageMeta } from '../utils/pageMeta';
import { useAuth } from '../contexts/AuthContext';

/** 대표 사진 콜라주(최대 5장, 2px 간격) */
function HeroCollage({ photos }) {
  if (!photos.length) {
    return <div aria-hidden="true" style={{ height: 200, borderRadius: 16, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: COLORS.textHint }}>📍</div>;
  }
  const n = Math.min(photos.length, 5);
  const areas = n === 1 ? '"a"' : n === 2 ? '"a b"' : n === 3 ? '"a b" "a c"' : n === 4 ? '"a b c" "a d d"' : '"a b c" "a d e"';
  const cols = n === 1 ? '1fr' : n <= 3 ? '2fr 1fr' : '2fr 1fr 1fr';
  return (
    <div className="spot-hero" style={{ display: 'grid', gridTemplateAreas: areas, gridTemplateColumns: cols, gridAutoRows: '1fr', gap: 2, borderRadius: 16, overflow: 'hidden' }}>
      {photos.slice(0, n).map((src, i) => (
        <div key={i} style={{ gridArea: 'abcde'[i], background: COLORS.bg, minHeight: 0 }}>
          <img src={src} alt={i === 0 ? '스팟 대표 사진' : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </div>
  );
}

function MiniMap({ lat, lng }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!KAKAO_MAP_KEY) return;
    let alive = true;
    loadKakaoMaps().then(() => {
      if (!alive || !ref.current) return;
      const { kakao } = window;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(ref.current, { center: pos, level: 4, draggable: false });
      new kakao.maps.Marker({ position: pos, map });
      setOk(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, [lat, lng]);
  if (!KAKAO_MAP_KEY) return null;
  return <div ref={ref} role="img" aria-label="스팟 위치 지도" style={{ height: 180, borderRadius: 14, overflow: 'hidden', background: COLORS.border, }} data-ready={ok ? 'true' : 'false'} />;
}

/** 출사 스팟 상세 (/spots/:id, 공개) */
export default function SpotDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openPhoto, setOpenPhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    spotApi.get(id)
      .then(s => { if (alive) setSpot(s); })
      .catch(err => { if (alive) setError(err?.response?.status === 404 ? 'notfound' : spotErrorMessage(err, '스팟을 불러오지 못했어요.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!spot) return undefined;
    return applyPageMeta({
      title: `${spot.name} — 출사 스팟 | Happiness`,
      description: [spot.region, spot.bestTime, `사진 ${spot.photoCount}장`].filter(Boolean).join(' · '),
      image: spot.previewPhotos?.[0],
    });
  }, [spot]);

  // 공개 GET은 새로고침 직후 토큰이 없어 canEdit이 false일 수 있다 → 로그인 회원 id로 한 번 더 판단
  const canEdit = !!spot && (spot.canEdit || (user?.id && user.id === spot.createdBy));

  const remove = async () => {
    setDeleting(true);
    try {
      await spotApi.remove(spot.id);
      navigate('/explore?tab=spots', { replace: true });
    } catch (err) {
      setError(spotErrorMessage(err, '삭제하지 못했어요.'));
      setDeleting(false); setConfirmDelete(false);
    }
  };

  const wrap = { maxWidth: 960, margin: '0 auto', padding: '20px 16px 120px' };

  if (loading) {
    return (
      <div style={wrap} aria-busy="true">
        <div style={{ height: 280, borderRadius: 16, background: COLORS.bg, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ height: 24, width: '50%', marginTop: 18, borderRadius: 8, background: COLORS.bg }} />
        <div style={{ height: 14, width: '30%', marginTop: 10, borderRadius: 6, background: COLORS.bg }} />
      </div>
    );
  }
  if (error === 'notfound' || !spot) {
    return (
      <div style={wrap}>
        <DotEmptyState theme="light" icon="📍" title={error === 'notfound' ? '스팟을 찾을 수 없어요' : '스팟을 불러오지 못했어요'}
          description={error !== 'notfound' ? error : '삭제됐거나 잘못된 주소예요.'} actionLabel="스팟 둘러보기" onAction={() => navigate('/explore?tab=spots')} />
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <style>{`
        .spot-hero { height: 360px; }
        @media (max-width: 767px) { .spot-hero { height: 240px; } .spot-photo-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } .spot-wrap { padding-bottom: 200px !important; } }
        .spot-photo { position: relative; padding: 0; border: none; cursor: pointer; aspect-ratio: 1 / 1; overflow: hidden; background: ${COLORS.bg}; border-radius: 10px; }
        .spot-photo .cap { position: absolute; inset: auto 0 0 0; padding: 18px 10px 8px; color: #fff; font-size: 12px; text-align: left;
          background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.15s ease; }
        .spot-photo:hover .cap, .spot-photo:focus-visible .cap { opacity: 1; }
        .spot-photo:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <div style={wrap} className="spot-wrap">
        <Link to="/explore?tab=spots" style={{ display: 'inline-block', marginBottom: 12, fontSize: 14, color: COLORS.textSecondary, textDecoration: 'none' }}>← 스팟 둘러보기</Link>
        <HeroCollage photos={spot.previewPhotos || []} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text, wordBreak: 'keep-all' }}>{spot.name}</h1>
            <div style={{ marginTop: 4, fontSize: 14, color: COLORS.textSecondary }}>{spot.address && spot.region && spot.address.startsWith(spot.region) ? spot.address : [spot.region, spot.address].filter(Boolean).join(' · ')}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {spot.bestTime && <TimeChip>🌅 {spot.bestTime}</TimeChip>}
              <TimeChip>📷 사진 {spot.photoCount}장</TimeChip>
            </div>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>고치기</Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>삭제</Button>
            </div>
          )}
        </div>

        {error && <div role="alert" style={{ marginTop: 12, fontSize: 14, color: COLORS.danger }}>{error}</div>}

        {spot.tips && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6 }}>팁</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: COLORS.text, whiteSpace: 'pre-line' }}>{spot.tips}</p>
          </div>
        )}

        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <MiniMap lat={spot.lat} lng={spot.lng} />
          <div>
            <a href={kakaoDirectionsUrl(spot.name, spot.lat, spot.lng)} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 14px', borderRadius: 10,
              border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>카카오맵 길찾기 ↗</a>
          </div>
        </div>

        <h2 style={{ margin: '28px 0 12px', fontSize: 18, fontWeight: 700, color: COLORS.text }}>이 스팟에서 찍은 사진</h2>
        {spot.photos.length === 0 ? (
          <p style={{ fontSize: 14, color: COLORS.textMuted }}>아직 연결된 사진이 없어요. 내 사진 상세에서 "📍 스팟 붙이기"로 연결할 수 있어요.</p>
        ) : (
          <div className="spot-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
            {spot.photos.map(p => (
              <button key={p.id} type="button" className="spot-photo" onClick={() => setOpenPhoto(p)} aria-label={`${p.title || '사진'} 보기`}>
                <img src={p.thumbnailUrl || p.imageUrl} alt={p.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span className="cap">{[p.title, p.memberName].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}
        <p style={{ marginTop: 16, fontSize: 12, color: COLORS.textMuted }}>
          남긴 사람: {spot.createdByName || '알 수 없음'} · 인물을 찍을 땐 꼭 동의를 받아 주세요.
        </p>
      </div>

      {/* 하단 고정 CTA */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      }} className="spot-cta">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Button fullWidth size="lg" onClick={() => navigate(user ? `/gatherings/new?spotId=${spot.id}` : '/login')}>
            이 스팟으로 출사 모임 만들기
          </Button>
        </div>
      </div>
      <style>{`@media (max-width: 767px) { .spot-cta { bottom: calc(76px + env(safe-area-inset-bottom)) !important; padding-bottom: 12px !important; border-top: none !important; background: transparent !important; } }`}</style>

      {openPhoto && <PhotoModal photo={openPhoto} onClose={() => setOpenPhoto(null)} />}
      {editing && (
        <SpotFormModal initial={spot} onClose={() => setEditing(false)}
          onSaved={(s) => { setSpot(prev => ({ ...prev, ...s, tips: s.tips ?? prev.tips })); setEditing(false); spotApi.get(spot.id).then(setSpot).catch(() => {}); }} />
      )}
      {confirmDelete && (
        <div onClick={() => !deleting && setConfirmDelete(false)} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="spot-del-title" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: COLORS.surface, borderRadius: 16, padding: 20 }}>
            <h2 id="spot-del-title" style={{ margin: '0 0 8px', fontSize: 18, color: COLORS.text }}>스팟을 삭제할까요?</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: COLORS.textSecondary }}>
              연결된 사진 {spot.photoCount}장에서 스팟 표시가 빠져요. 사진은 지워지지 않아요. 되돌릴 수 없어요.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" fullWidth disabled={deleting} onClick={() => setConfirmDelete(false)}>취소</Button>
              <Button variant="danger" fullWidth loading={deleting} onClick={remove}>삭제</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
