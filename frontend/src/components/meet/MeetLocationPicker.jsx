import { useState, useEffect, useRef, useCallback } from 'react';

const KAKAO_KEY = process.env.REACT_APP_KAKAO_MAP_KEY || '';

function loadKakaoMaps() {
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) return Promise.resolve();
  if (window.__kakaoMapsLoading) return window.__kakaoMapsLoading;
  window.__kakaoMapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => { window.kakao.maps.load(resolve); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.__kakaoMapsLoading;
}

export default function MeetLocationPicker({ value, onChange, readOnly = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [useTextMode, setUseTextMode] = useState(!KAKAO_KEY);
  const [textName, setTextName] = useState(value?.locationName || '');
  const [textAddr, setTextAddr] = useState(value?.locationAddress || '');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!KAKAO_KEY) { setUseTextMode(true); return; }
    loadKakaoMaps()
      .then(() => setKakaoReady(true))
      .catch(() => setUseTextMode(true));
  }, []);

  useEffect(() => {
    if (!kakaoReady || !mapRef.current || mapInstance.current) return;
    const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
    mapInstance.current = new window.kakao.maps.Map(mapRef.current, { center, level: 4 });
    if (value?.locationLat && value?.locationLng) {
      placeMarker(value.locationLat, value.locationLng, value.locationName);
    }
  }, [kakaoReady]);

  const placeMarker = useCallback((lat, lng, name) => {
    if (!mapInstance.current) return;
    const pos = new window.kakao.maps.LatLng(lat, lng);
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.kakao.maps.Marker({ position: pos, map: mapInstance.current });
    mapInstance.current.setCenter(pos);
    mapInstance.current.setLevel(3);
  }, []);

  function handleSearch() {
    if (!kakaoReady || !query.trim()) return;
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(query, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setResults(data.slice(0, 5));
      } else {
        setResults([]);
      }
    });
  }

  function handleSelect(place) {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    placeMarker(lat, lng, place.place_name);
    setResults([]);
    setQuery(place.place_name);
    onChange && onChange({
      locationName: place.place_name,
      locationAddress: place.road_address_name || place.address_name,
      locationLat: lat,
      locationLng: lng,
    });
  }

  function handleTextSave() {
    onChange && onChange({ locationName: textName, locationAddress: textAddr, locationLat: null, locationLng: null });
  }

  if (readOnly) {
    if (!value?.locationName) return <div style={{ color: '#9090b0', fontSize: 13 }}>장소 미정</div>;
    return (
      <div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>📍 {value.locationName}</div>
        {value.locationAddress && <div style={{ color: '#9090b0', fontSize: 12, marginTop: 2 }}>{value.locationAddress}</div>}
        {value.locationLat && value.locationLng && (
          <a
            href={`https://map.kakao.com/link/map/${encodeURIComponent(value.locationName)},${value.locationLat},${value.locationLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#5b6ef5', marginTop: 4, display: 'inline-block' }}
          >
            카카오맵에서 보기 →
          </a>
        )}
      </div>
    );
  }

  if (useTextMode) {
    return (
      <div>
        <div style={{ color: '#9090b0', fontSize: 11, marginBottom: 8 }}>지도 API 키 미설정 — 텍스트로 입력</div>
        <input
          value={textName}
          onChange={e => setTextName(e.target.value)}
          placeholder="장소 이름 (예: 스타벅스 홍대점)"
          style={inputStyle}
        />
        <input
          value={textAddr}
          onChange={e => setTextAddr(e.target.value)}
          placeholder="주소 (선택)"
          style={{ ...inputStyle, marginTop: 6 }}
        />
        <button onClick={handleTextSave} style={saveBtnStyle}>저장</button>
        {value?.locationName && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(91,110,245,0.12)', borderRadius: 8, color: '#ccc', fontSize: 13 }}>
            📍 {value.locationName}{value.locationAddress ? ` — ${value.locationAddress}` : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="장소 검색 (예: 홍대 카페)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleSearch} style={saveBtnStyle}>검색</button>
      </div>

      {results.length > 0 && (
        <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          {results.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,110,245,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{p.place_name}</div>
              <div style={{ color: '#9090b0', fontSize: 11, marginTop: 2 }}>{p.road_address_name || p.address_name}</div>
            </div>
          ))}
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', background: '#12122a' }} />

      {value?.locationName && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(91,110,245,0.12)', borderRadius: 8, color: '#ccc', fontSize: 13 }}>
          📍 {value.locationName}
          {value.locationAddress && <span style={{ color: '#9090b0' }}> — {value.locationAddress}</span>}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const saveBtnStyle = {
  background: '#5b6ef5',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
  whiteSpace: 'nowrap',
};
