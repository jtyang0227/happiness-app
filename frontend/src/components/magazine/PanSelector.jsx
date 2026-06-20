const PAN_TYPES = [
  {
    code: 'FULL_BLEED',
    label: '전면판',
    desc: '100% 전면 채움',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="80" height="60" fill="#5b6ef5" opacity="0.8" />
        <rect x="0" y="42" width="80" height="18" fill="rgba(0,0,0,0.5)" />
        <rect x="6" y="46" width="30" height="3" rx="1" fill="white" opacity="0.9" />
        <rect x="6" y="52" width="20" height="2" rx="1" fill="white" opacity="0.5" />
      </svg>
    ),
  },
  {
    code: 'SPLIT',
    label: '2분할판',
    desc: '이미지 58% + 텍스트 42%',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="46" height="60" fill="#5b6ef5" opacity="0.8" />
        <rect x="47" y="0" width="33" height="60" fill="#f5f5fa" />
        <rect x="52" y="14" width="22" height="4" rx="1" fill="#1a1a2e" opacity="0.7" />
        <rect x="52" y="22" width="20" height="2" rx="1" fill="#5c5c7a" opacity="0.5" />
        <rect x="52" y="27" width="18" height="2" rx="1" fill="#5c5c7a" opacity="0.5" />
      </svg>
    ),
  },
  {
    code: 'EDITORIAL',
    label: '편집판',
    desc: '이미지 70% + 사이드바 30%',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="54" height="60" fill="#5b6ef5" opacity="0.8" />
        <rect x="55" y="0" width="25" height="60" fill="#ffffff" />
        <rect x="55" y="0" width="1" height="60" fill="#e2e2ee" />
        <circle cx="62" cy="10" r="5" fill="#eef0ff" />
        <rect x="58" y="20" width="18" height="3" rx="1" fill="#1a1a2e" opacity="0.6" />
        <rect x="58" y="26" width="15" height="2" rx="1" fill="#9090b0" opacity="0.5" />
        <rect x="58" y="30" width="14" height="2" rx="1" fill="#9090b0" opacity="0.5" />
      </svg>
    ),
  },
  {
    code: 'TRIPTYCH',
    label: '3면판',
    desc: '3장 나란히',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="80" height="60" fill="#f5f5fa" />
        <rect x="2" y="8" width="23" height="42" rx="2" fill="#5b6ef5" opacity="0.7" />
        <rect x="28" y="8" width="23" height="42" rx="2" fill="#5b6ef5" opacity="0.85" />
        <rect x="54" y="8" width="23" height="42" rx="2" fill="#5b6ef5" opacity="0.7" />
      </svg>
    ),
  },
  {
    code: 'FEATURE',
    label: '화보판',
    desc: '대표 60% + 보조 3장',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="46" height="60" fill="#5b6ef5" opacity="0.8" />
        <rect x="48" y="0" width="32" height="18" rx="2" fill="#5b6ef5" opacity="0.6" />
        <rect x="48" y="21" width="32" height="18" rx="2" fill="#5b6ef5" opacity="0.6" />
        <rect x="48" y="42" width="32" height="18" rx="2" fill="#5b6ef5" opacity="0.6" />
      </svg>
    ),
  },
  {
    code: 'PORTRAIT_FOCUS',
    label: '인물판',
    desc: '중앙 세로 + 좌우 여백',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="80" height="60" fill="#eef0ff" />
        <rect x="20" y="4" width="40" height="52" rx="3" fill="#5b6ef5" opacity="0.8" />
      </svg>
    ),
  },
  {
    code: 'FILM_STRIP',
    label: '필름판',
    desc: '필름 스트립 가로 스크롤',
    preview: (
      <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
        <rect x="0" y="0" width="80" height="60" fill="#1a1a1a" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={4 + i * 10} y={4} width={6} height={5} rx={1} fill="rgba(255,255,255,0.2)" />
        ))}
        <rect x="4" y="12" width="22" height="32" rx="2" fill="#5b6ef5" opacity="0.7" />
        <rect x="29" y="12" width="22" height="32" rx="2" fill="#5b6ef5" opacity="0.5" />
        <rect x="54" y="12" width="22" height="32" rx="2" fill="#5b6ef5" opacity="0.5" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={4 + i * 10} y={47} width={6} height={5} rx={1} fill="rgba(255,255,255,0.2)" />
        ))}
      </svg>
    ),
  },
];

export default function PanSelector({ selected, onChange }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
          🗞 매거진 판 타입
        </span>
        {selected && (
          <span style={{ fontSize: 12, color: '#5b6ef5' }}>
            {PAN_TYPES.find(p => p.code === selected)?.label}
          </span>
        )}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {PAN_TYPES.map(({ code, label, desc, preview }) => {
          const isSelected = selected === code;
          return (
            <button
              key={code}
              onClick={() => onChange(code)}
              title={desc}
              style={{
                padding: 0, borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${isSelected ? '#5b6ef5' : '#e2e2ee'}`,
                background: isSelected ? '#eef0ff' : '#fff',
                overflow: 'hidden', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column',
                boxShadow: isSelected ? '0 0 0 2px rgba(91,110,245,0.2)' : 'none',
              }}
            >
              <div style={{ width: '100%', aspectRatio: '4/3', position: 'relative' }}>
                {preview}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#5b6ef5', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                  }}>✓</div>
                )}
              </div>
              <div style={{
                padding: '6px 6px 8px', fontSize: 11, fontWeight: isSelected ? 600 : 400,
                color: isSelected ? '#5b6ef5' : '#5c5c7a', textAlign: 'center',
              }}>
                {label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
