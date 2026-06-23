import { GENRE_LIST, GENRE_META } from '../../constants/colors';

export default function GenreSelector({
  primaryGenre, subGenres = [], onChangePrimary, onChangeSubGenres, suggestedGenre,
}) {
  const handleClick = (code) => {
    if (code === primaryGenre) {
      onChangePrimary(null);
      return;
    }
    const isSubSelected = subGenres.includes(code);
    if (isSubSelected) {
      onChangeSubGenres(subGenres.filter(g => g !== code));
      return;
    }
    if (!primaryGenre) {
      onChangePrimary(code);
      return;
    }
    if (subGenres.length < 2) {
      onChangeSubGenres([...subGenres, code]);
    }
  };

  const getState = (code) => {
    if (code === primaryGenre) return 'primary';
    if (subGenres.includes(code)) return 'sub';
    if (primaryGenre && subGenres.length >= 2) return 'disabled';
    return 'default';
  };

  const btnStyle = (code) => {
    const state = getState(code);
    return {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 6px', borderRadius: 12, cursor: state === 'disabled' ? 'default' : 'pointer',
      fontSize: 12, border: '1px solid',
      opacity: state === 'disabled' ? 0.4 : 1,
      background: state === 'primary' ? '#5b6ef5'
        : state === 'sub' ? '#eef0ff'
        : '#ffffff',
      color: state === 'primary' ? '#fff'
        : state === 'sub' ? '#5b6ef5'
        : '#9090b0',
      borderColor: state === 'primary' ? '#5b6ef5'
        : state === 'sub' ? '#5b6ef5'
        : '#e2e2ee',
      fontWeight: state === 'primary' ? 700 : 400,
      transition: 'all 0.15s',
      userSelect: 'none',
    };
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
          📌 장르 선택
        </span>
        <span style={{ fontSize: 11, color: '#9090b0' }}>
          주 장르 1개 · 서브 최대 2개
        </span>
      </div>

      {suggestedGenre && GENRE_META[suggestedGenre] && !primaryGenre && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '8px 12px', background: '#eef0ff', borderRadius: 10,
          fontSize: 13, color: '#5b6ef5',
        }}>
          <span>💡 AI 추천: {GENRE_META[suggestedGenre].emoji} {GENRE_META[suggestedGenre].label}</span>
          <button
            onClick={() => onChangePrimary(suggestedGenre)}
            style={{
              padding: '2px 10px', borderRadius: 8, border: 'none',
              background: '#5b6ef5', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}
          >적용</button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {GENRE_LIST.map(({ code, emoji, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleClick(code)}
            style={btnStyle(code)}
            disabled={getState(code) === 'disabled'}
          >
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span>{code === primaryGenre ? label + ' ✓' : label}</span>
          </button>
        ))}
      </div>

      {(primaryGenre || subGenres.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#5c5c7a' }}>
          {primaryGenre && (
            <span>주: {GENRE_META[primaryGenre]?.emoji} {GENRE_META[primaryGenre]?.label}</span>
          )}
          {subGenres.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              서브: {subGenres.map(g => GENRE_META[g]?.label).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
