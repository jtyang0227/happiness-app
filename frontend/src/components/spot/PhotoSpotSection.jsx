import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import { Input } from '../common/Input';
import SpotFormModal from './SpotFormModal';
import { spotApi, spotErrorMessage } from '../../services/spotApi';

/** 기존 스팟 검색 → 고르기, 없으면 새로 만들기 (사진 주인 전용 시트) */
function SpotPickerSheet({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const reqRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.getElementById('spot-picker-q')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey, true); };
  }, []);

  useEffect(() => {
    const id = ++reqRef.current;
    const t = setTimeout(() => {
      spotApi.list({ q: q.trim() || undefined, size: 12 })
        .then(r => { if (id === reqRef.current) { setItems(r.data || []); setError(''); } })
        .catch(err => { if (id === reqRef.current) setError(spotErrorMessage(err, '스팟을 불러오지 못했어요.')); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (creating) {
    return (
      <SpotFormModal initial={{ name: q.trim() }} onClose={() => setCreating(false)}
        onSaved={onPick} onPickExisting={onPick} />
    );
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="spot-picker-title" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto', background: COLORS.surface,
        borderRadius: '20px 20px 0 0', padding: '22px 20px calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', animation: 'slideUp 0.2s ease',
      }}>
        <h2 id="spot-picker-title" style={{ margin: '0 0 12px', fontSize: 19, fontWeight: 700, color: COLORS.text }}>출사 스팟 고르기</h2>
        <Input id="spot-picker-q" aria-label="스팟 이름 검색" value={q} onChange={e => setQ(e.target.value)} placeholder="스팟 이름으로 찾기" />
        {error && <div role="alert" style={{ marginTop: 10, fontSize: 14, color: COLORS.danger }}>{error}</div>}
        <ul style={{ listStyle: 'none', margin: '12px 0', padding: 0, display: 'grid', gap: 6 }}>
          {items === null && !error && [0, 1, 2].map(i => (
            <li key={i} style={{ height: 52, borderRadius: 12, background: COLORS.bg }} />
          ))}
          {items?.map(s => (
            <li key={s.id}>
              <button type="button" className="spot-option" onClick={() => onPick(s)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12,
                border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer', textAlign: 'left', minHeight: 52,
              }}>
                <span style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: COLORS.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.previewPhotos?.[0] ? <img src={s.previewPhotos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📍'}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COLORS.text }}>{s.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: COLORS.textMuted }}>{[s.region, `사진 ${s.photoCount}장`].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
          {items?.length === 0 && (
            <li style={{ padding: '14px 4px', fontSize: 14, color: COLORS.textMuted }}>찾는 스팟이 없어요. 새로 만들어 보세요.</li>
          )}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" fullWidth onClick={onClose}>닫기</Button>
          <Button fullWidth onClick={() => setCreating(true)}>＋ 새 스팟 만들기</Button>
        </div>
      </div>
      <style>{`.spot-option:hover{background:${COLORS.surfaceDim} !important}.spot-option:focus-visible{outline:2px solid ${COLORS.primary};outline-offset:2px}`}</style>
    </div>
  );
}

/**
 * 사진 상세의 "출사 스팟" 줄 — 누구에게나 연결된 스팟 링크를 보여 주고, 사진 주인에게는 붙이기·바꾸기·빼기를 준다.
 * autoOpen: 내보내기 직후 "스팟 붙이기"로 들어왔을 때 시트를 바로 연다.
 */
export default function PhotoSpotSection({ photoId, isOwner, autoOpen = false }) {
  const [spot, setSpot] = useState(undefined);   // undefined = 로딩, null = 없음
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setSpot(undefined);
    spotApi.getPhotoSpot(photoId)
      .then(r => { if (alive) setSpot(r.data || null); })
      .catch(() => { if (alive) setSpot(null); });
    return () => { alive = false; };
  }, [photoId]);

  useEffect(() => { if (autoOpen && isOwner) setPicking(true); }, [autoOpen, isOwner]);

  const link = async (next) => {
    setPicking(false); setBusy(true); setError('');
    try {
      const r = await spotApi.setPhotoSpot(photoId, next ? next.id : null);
      setSpot(r.data || null);
    } catch (err) {
      setError(spotErrorMessage(err, '스팟을 바꾸지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  if (spot === undefined) return null;
  if (!spot && !isOwner) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      {spot ? (
        <Link to={`/spots/${spot.id}`} className="photo-spot-link" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', minHeight: 36, borderRadius: 999,
          background: COLORS.primaryLight, color: COLORS.primaryDark, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          📍 {spot.name}{spot.region ? ` · ${spot.region}` : ''}
        </Link>
      ) : (
        <span style={{ fontSize: 14, color: COLORS.textMuted }}>출사 스팟이 없어요</span>
      )}
      {isOwner && (
        <>
          <Button variant="ghost" size="sm" loading={busy} onClick={() => setPicking(true)}>{spot ? '바꾸기' : '📍 스팟 붙이기'}</Button>
          {spot && <Button variant="ghost" size="sm" disabled={busy} onClick={() => link(null)}>빼기</Button>}
        </>
      )}
      {error && <span role="alert" style={{ fontSize: 13, color: COLORS.danger }}>{error}</span>}
      {picking && <SpotPickerSheet onClose={() => setPicking(false)} onPick={link} />}
      <style>{`.photo-spot-link:hover{background:${COLORS.primaryTonal} !important}.photo-spot-link:focus-visible{outline:2px solid ${COLORS.primary};outline-offset:2px}`}</style>
    </div>
  );
}
