import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import DotEmptyState from '../common/DotEmptyState';
import SpotCard, { SpotCollage, TimeChip } from './SpotCard';
import SpotFormModal from './SpotFormModal';
import { spotApi, spotErrorMessage } from '../../services/spotApi';
import { KAKAO_MAP_KEY, loadKakaoMaps } from '../../utils/kakaoMap';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 24;
const NEAR_DEG = 0.03;   // "내 주변" 목록 범위 (위도 약 3km)
const SEOUL = { lat: 37.5665, lng: 126.978 };

function SkeletonGrid() {
  return (
    <div className="spot-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 8 }}>
          <div style={{ height: 180, borderRadius: 14, background: COLORS.bg, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height: 16, width: '60%', margin: '12px 6px 8px', borderRadius: 6, background: COLORS.bg }} />
          <div style={{ height: 12, width: '40%', margin: '0 6px 6px', borderRadius: 6, background: COLORS.bg }} />
        </div>
      ))}
    </div>
  );
}

/** 지도 모드 — 지도가 멈출 때마다(300ms) 보이는 범위의 스팟을 불러와 사진 썸네일 핀으로 보여 준다 */
function SpotMap({ center, onError }) {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const reqRef = useRef(0);
  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const sw = b.getSouthWest(); const ne = b.getNorthEast();
    const id = ++reqRef.current;
    setLoading(true);
    spotApi.list({ minLat: sw.getLat(), maxLat: ne.getLat(), minLng: sw.getLng(), maxLng: ne.getLng(), size: 100 })
      .then(r => { if (id === reqRef.current) setSpots(r.data || []); })
      .catch(err => { if (id === reqRef.current) onError(spotErrorMessage(err, '스팟을 불러오지 못했어요.')); })
      .finally(() => { if (id === reqRef.current) setLoading(false); });
  }, [onError]);

  useEffect(() => {
    let timer;
    const { kakao } = window;
    const map = new kakao.maps.Map(boxRef.current, { center: new kakao.maps.LatLng(SEOUL.lat, SEOUL.lng), level: 7 });
    mapRef.current = map;
    const onIdle = () => { clearTimeout(timer); timer = setTimeout(fetchBounds, 300); };
    kakao.maps.event.addListener(map, 'idle', onIdle);
    fetchBounds();
    return () => { clearTimeout(timer); kakao.maps.event.removeListener(map, 'idle', onIdle); mapRef.current = null; };
  }, [fetchBounds]);

  useEffect(() => {
    if (center && mapRef.current) mapRef.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, [center]);

  // 핀(사진 썸네일 원) — CustomOverlay. DOM 버튼이라 키보드로도 고를 수 있다
  useEffect(() => {
    const { kakao } = window;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = spots.map(s => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'spot-pin';
      el.setAttribute('aria-label', `${s.name} 스팟`);
      const active = selected?.id === s.id;
      Object.assign(el.style, {
        width: '36px', height: '36px', borderRadius: '50%', padding: '0', cursor: 'pointer', overflow: 'hidden',
        border: `2px solid ${active ? COLORS.primary : '#ffffff'}`, background: COLORS.surface,
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)', fontSize: '16px',
      });
      if (s.previewPhotos?.[0]) {
        const img = document.createElement('img');
        img.src = s.previewPhotos[0]; img.alt = '';
        Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
        el.appendChild(img);
      } else {
        el.textContent = '📍';
      }
      el.onclick = () => setSelected(s);
      const o = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(s.lat, s.lng), content: el, yAnchor: 0.5, zIndex: active ? 3 : 1 });
      o.setMap(mapRef.current);
      return o;
    });
    return () => overlaysRef.current.forEach(o => o.setMap(null));
  }, [spots, selected]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={boxRef} role="application" aria-label="출사 스팟 지도" style={{ width: '100%', height: 'min(64vh, 560px)', borderRadius: 16, overflow: 'hidden', background: COLORS.border }} />
      {loading && (
        <div aria-live="polite" style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: 999, background: COLORS.surface, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', fontSize: 13, color: COLORS.textSecondary }}>
          스팟 찾는 중…
        </div>
      )}
      {!loading && spots.length === 0 && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: 999, background: COLORS.surface, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', fontSize: 13, color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>
          이 지역엔 아직 스팟이 없어요
        </div>
      )}
      {selected && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, background: COLORS.surface, borderRadius: 16, padding: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 96, flexShrink: 0 }}><SpotCollage photos={selected.previewPhotos} height={72} radius={10} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary, margin: '2px 0 6px' }}>{[selected.region, `사진 ${selected.photoCount}장`].filter(Boolean).join(' · ')}</div>
            {selected.bestTime && <TimeChip>🌅 {selected.bestTime}</TimeChip>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Button size="sm" onClick={() => navigate(`/spots/${selected.id}`)}>자세히 →</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)} aria-label="닫기">닫기</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 둘러보기 › 스팟 탭 */
export default function SpotDiscovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mapAvailable, setMapAvailable] = useState(false);
  const [view, setView] = useState('list');
  const [regionInput, setRegionInput] = useState('');
  const [region, setRegion] = useState('');
  const [near, setNear] = useState(null);        // { lat, lng } — 내 주변
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [creating, setCreating] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!KAKAO_MAP_KEY) return;
    loadKakaoMaps().then(() => setMapAvailable(true)).catch(() => setMapAvailable(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRegion(regionInput.trim()), 400);
    return () => clearTimeout(t);
  }, [regionInput]);

  const query = useCallback((p) => {
    const params = { region: region || undefined, page: p, size: PAGE_SIZE };
    if (near) Object.assign(params, { minLat: near.lat - NEAR_DEG, maxLat: near.lat + NEAR_DEG, minLng: near.lng - NEAR_DEG * 1.25, maxLng: near.lng + NEAR_DEG * 1.25 });
    return spotApi.list(params);
  }, [region, near]);

  useEffect(() => {
    if (view !== 'list') return;
    const id = ++reqRef.current;
    setLoading(true); setError('');
    query(0)
      .then(r => { if (id !== reqRef.current) return; setItems(r.data || []); setHasNext(!!r.hasNext); setPage(0); })
      .catch(err => { if (id === reqRef.current) setError(spotErrorMessage(err, '스팟을 불러오지 못했어요.')); })
      .finally(() => { if (id === reqRef.current) setLoading(false); });
  }, [query, view]);

  const loadMore = async () => {
    setMoreLoading(true); setError('');
    try {
      const r = await query(page + 1);
      setItems(prev => { const seen = new Set(prev.map(s => s.id)); return [...prev, ...(r.data || []).filter(s => !seen.has(s.id))]; });
      setHasNext(!!r.hasNext); setPage(page + 1);
    } catch (err) {
      setError(spotErrorMessage(err, '더 불러오지 못했어요.'));
    } finally {
      setMoreLoading(false);
    }
  };

  // 위치는 버튼을 눌렀을 때만 한 번 묻는다
  const locate = () => {
    if (!navigator.geolocation) { setError('이 브라우저는 위치를 지원하지 않아요.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setError('위치를 가져오지 못했어요. 브라우저 위치 권한을 확인해 주세요.'); setLocating(false); },
      { timeout: 10000 },
    );
  };

  const startCreate = () => (user ? setCreating(true) : navigate('/login'));

  return (
    <div>
      <style>{`
        .spot-grid { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 1023px) { .spot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 767px)  { .spot-grid { grid-template-columns: minmax(0, 1fr); } }
        .spot-card { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .spot-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); border-color: ${COLORS.textHint} !important; }
        .spot-card:focus-visible, .spot-seg:focus-visible, .spot-pin:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .spot-seg { transition: background 0.15s ease, color 0.15s ease; }
      `}</style>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label htmlFor="spot-region-q" style={{
          flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px',
          borderRadius: 999, border: `1px solid ${COLORS.border}`, background: COLORS.surface,
        }}>
          <span aria-hidden="true">📍</span>
          <input id="spot-region-q" type="search" value={regionInput} onChange={e => setRegionInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setRegion(regionInput.trim()); }}
            placeholder="지역으로 찾기 (예: 성동구, 부산)" aria-label="지역으로 스팟 찾기"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: COLORS.text }} />
        </label>
        {mapAvailable && (
          <div role="tablist" aria-label="보기 방식" style={{ display: 'inline-flex', padding: 4, borderRadius: 12, background: COLORS.bg }}>
            {[['map', '지도'], ['list', '목록']].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} className="spot-seg" onClick={() => setView(k)} style={{
                height: 36, padding: '0 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14,
                fontWeight: view === k ? 700 : 500, background: view === k ? COLORS.surface : 'transparent',
                color: view === k ? COLORS.text : COLORS.textMuted, boxShadow: view === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        )}
        <Button variant="secondary" loading={locating} onClick={locate} title="누를 때만 현재 위치를 한 번 사용해요">내 주변</Button>
        <Button onClick={startCreate}>＋ 스팟</Button>
      </div>

      {near && view === 'list' && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={() => setNear(null)} className="spot-seg" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999,
            border: 'none', background: COLORS.primaryLight, color: COLORS.primaryDark, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }} aria-label="내 주변 필터 지우기">내 주변 약 3km ✕</button>
        </div>
      )}

      {error && <div role="alert" style={{ marginBottom: 12, fontSize: 14, color: COLORS.danger }}>{error}</div>}

      {view === 'map' && mapAvailable ? (
        <SpotMap center={near} onError={setError} />
      ) : loading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <DotEmptyState theme="light" icon="📍"
          title={region || near ? '이 지역엔 아직 스팟이 없어요' : '아직 출사 스팟이 없어요'}
          description="찍기 좋았던 공공 장소를 첫 스팟으로 남겨 보세요."
          actionLabel="첫 스팟 남기기" onAction={startCreate} />
      ) : (
        <>
          <div className="spot-grid">
            {items.map((s, i) => (
              <div key={s.id} style={{ animation: `fadeInUp 0.3s ease ${Math.min(i, 10) * 0.03}s both` }}>
                <SpotCard spot={s} />
              </div>
            ))}
          </div>
          {hasNext && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <Button variant="secondary" loading={moreLoading} onClick={loadMore}>스팟 더 보기</Button>
            </div>
          )}
        </>
      )}

      {!mapAvailable && (
        <p style={{ marginTop: 16, fontSize: 12, color: COLORS.textMuted }}>
          지도를 불러올 수 없어 목록으로 보여 드려요. <Link to="/gatherings" style={{ color: COLORS.primary }}>출사 모임 보기 →</Link>
        </p>
      )}

      {creating && (
        <SpotFormModal onClose={() => setCreating(false)}
          onSaved={(s) => { setCreating(false); navigate(`/spots/${s.id}`); }}
          onPickExisting={(s) => { setCreating(false); navigate(`/spots/${s.id}`); }} />
      )}
    </div>
  );
}
