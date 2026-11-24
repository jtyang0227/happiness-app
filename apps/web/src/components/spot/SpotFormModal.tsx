import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import { FormField, Input, Textarea } from '../common/Input';
import { spotApi, spotErrorMessage } from '../../services/spotApi';
import { KAKAO_MAP_KEY, loadKakaoMaps } from '../../utils/kakaoMap';

/** 카카오 주소("서울 성동구 성수동1가 …")에서 앞 두 단어를 지역으로 */
function regionFromAddress(addr) {
  return (addr || '').split(/\s+/).slice(0, 2).join(' ').slice(0, 30);
}

/**
 * 스팟 만들기/고치기 모달.
 * 장소는 카카오 장소 검색(키가 있을 때) 또는 "지금 위치"로 정한다 — 사진 EXIF GPS는 쓰지 않는다.
 * 저장 직전 근처 중복 후보가 있으면 "혹시 이 스팟인가요?"로 기존 스팟을 고를 수 있게 한다(onPickExisting).
 */
export default function SpotFormModal({ initial, onClose, onSaved, onPickExisting }: { initial?: any; onClose?: (...args: any[]) => any; onSaved?: (...args: any[]) => any; onPickExisting?: (...args: any[]) => any }) {
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || '', address: initial?.address || '', region: initial?.region || '',
    bestTime: initial?.bestTime || '', tips: initial?.tips || '',
    lat: initial?.lat ?? null, lng: initial?.lng ?? null,
  });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const focusName = () => document.getElementById('spot-name')?.focus();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    focusName();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); } };
    window.addEventListener('keydown', onKey, true);
    if (KAKAO_MAP_KEY) loadKakaoMaps().then(() => setKakaoReady(true)).catch(() => {});
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey, true); };
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const search = () => {
    if (!kakaoReady || !query.trim()) return;
    new window.kakao.maps.services.Places().keywordSearch(query.trim(), (data, status) => {
      setResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 5) : []);
      if (status !== window.kakao.maps.services.Status.OK) setError('검색 결과가 없어요. 다른 이름으로 찾아보세요.');
      else setError('');
    });
  };

  const pickPlace = (p) => {
    const address = p.road_address_name || p.address_name || '';
    setForm(f => ({
      ...f, name: f.name || p.place_name.slice(0, 50), address: address.slice(0, 200),
      region: f.region || regionFromAddress(p.address_name || address), lat: parseFloat(p.y), lng: parseFloat(p.x),
    }));
    setResults([]); setQuery(p.place_name);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('이 브라우저는 위치를 지원하지 않아요.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }));
        setLocating(false);
      },
      () => { setError('위치를 가져오지 못했어요. 브라우저 위치 권한을 확인해 주세요.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async (skipDuplicateCheck = false) => {
    if (!form.name.trim()) { setError('스팟 이름을 입력해 주세요.'); focusName(); return; }
    if (form.lat == null || form.lng == null) { setError('장소를 검색하거나 "지금 위치"로 정해 주세요.'); return; }
    setSaving(true); setError('');
    try {
      if (!editing && !skipDuplicateCheck && onPickExisting) {
        const dup = await spotApi.nearbyDuplicate(form.name.trim(), form.lat, form.lng);
        if (dup.length > 0) { setDuplicates(dup); setSaving(false); return; }
      }
      const body = { ...form, name: form.name.trim() };
      const saved = editing ? await spotApi.update(initial.id, body) : await spotApi.create(body);
      onSaved(saved);
    } catch (err) {
      setError(spotErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="spot-form-title" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: COLORS.surface,
        borderRadius: '20px 20px 0 0', padding: '22px 20px calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', animation: 'slideUp 0.2s ease',
      }}>
        <h2 id="spot-form-title" style={{ margin: '0 0 16px', fontSize: 19, fontWeight: 700, color: COLORS.text }}>
          {editing ? '스팟 고치기' : '새 출사 스팟'}
        </h2>

        {duplicates ? (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 15, color: COLORS.textSecondary }}>근처에 비슷한 스팟이 있어요. 혹시 이 스팟인가요?</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {duplicates.map(d => (
                <li key={d.id}>
                  <button type="button" className="spot-option" onClick={() => onPickExisting(d)} style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${COLORS.border}`, background: COLORS.surface, minHeight: 44,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>📍 {d.name}</div>
                    <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{[d.region, `약 ${d.distanceM}m`].filter(Boolean).join(' · ')}</div>
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button variant="secondary" fullWidth onClick={() => setDuplicates(null)}>뒤로</Button>
              <Button fullWidth loading={saving} onClick={() => save(true)}>그래도 새로 만들기</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <FormField id="spot-name" label="스팟 이름" required>
              <Input id="spot-name" value={form.name} onChange={set('name')} maxLength={50} placeholder="예: 서울숲 은행나무길" />
            </FormField>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>장소 <span style={{ color: COLORS.danger }}>*</span></div>
              {kakaoReady && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Input id="spot-place" aria-label="장소 검색" value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder="장소 이름으로 검색" />
                  <Button variant="secondary" onClick={search}>검색</Button>
                </div>
              )}
              {results.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  {results.map(p => (
                    <li key={p.id}>
                      <button type="button" className="spot-option" onClick={() => pickPlace(p)} style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${COLORS.borderLight}`,
                        background: COLORS.surface, cursor: 'pointer', minHeight: 44,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{p.place_name}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{p.road_address_name || p.address_name}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" loading={locating} onClick={useMyLocation}>📍 지금 위치로</Button>
                <span aria-live="polite" style={{ fontSize: 13, color: form.lat != null ? COLORS.successText : COLORS.textMuted }}>
                  {form.lat != null ? `위치 정해짐 (${form.lat.toFixed(4)}, ${form.lng.toFixed(4)})` : '아직 위치가 없어요'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormField id="spot-region" label="지역">
                <Input id="spot-region" value={form.region} onChange={set('region')} maxLength={30} placeholder="서울 성동구" />
              </FormField>
              <FormField id="spot-best" label="찍기 좋은 시간">
                <Input id="spot-best" value={form.bestTime} onChange={set('bestTime')} maxLength={30} placeholder="일몰 30분 전" />
              </FormField>
            </div>
            <FormField id="spot-address" label="주소">
              <Input id="spot-address" value={form.address} onChange={set('address')} maxLength={200} />
            </FormField>
            <FormField id="spot-tips" label="팁" helperText={`${form.tips.length}/1000 · 주차, 입장료, 촬영 포인트 등`}>
              <Textarea id="spot-tips" value={form.tips} onChange={set('tips')} maxLength={1000} rows={3} />
            </FormField>

            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>
              공공 장소만 남겨 주세요. 집·작업실처럼 개인 장소는 스팟으로 만들지 않아요.
            </p>
            {error && <div role="alert" style={{ fontSize: 14, color: COLORS.danger }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" fullWidth onClick={onClose}>취소</Button>
              <Button fullWidth loading={saving} onClick={() => save(false)}>{editing ? '저장' : '스팟 만들기'}</Button>
            </div>
          </div>
        )}
      </div>
      <style>{`.spot-option:hover{background:${COLORS.surfaceDim} !important}.spot-option:focus-visible{outline:2px solid ${COLORS.primary};outline-offset:-2px}`}</style>
    </div>
  );
}
