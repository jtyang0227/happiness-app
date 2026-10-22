import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';
import Button from '../components/common/Button';
import TemplateBlocks from '../components/portfolio/templates/TemplateBlocks';
import { BLOCK_REGISTRY, BLOCK_TYPES } from '../components/portfolio/blocks/blockRegistry';
import {
  ACCENT_PRESETS, BACKGROUNDS, SPACINGS, HEADING_FONTS, STARTER_PRESETS,
  newBlockId, parseSections, parseStyle, serializeSections, serializeStyle, DEFAULT_STYLE,
} from '../components/portfolio/blocks/layout';

const MAX_BLOCKS = 30;   // 서버 PortfolioLayoutValidator.MAX_BLOCKS와 같게

function useIsNarrow() {
  const q = '(max-width: 1023px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const mql = window.matchMedia?.(q);
    if (!mql) return undefined;
    const fn = () => setNarrow(mql.matches);
    mql.addEventListener?.('change', fn);
    return () => mql.removeEventListener?.('change', fn);
  }, []);
  return narrow;
}

const card = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 };
const sectionTitle = { fontSize: 13, fontWeight: 800, color: COLORS.text, margin: '0 0 12px' };
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 };
const input = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
  fontSize: 14, color: COLORS.text, background: COLORS.surface, fontFamily: 'inherit',
};

function Segment({ options, value, onChange, ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'flex', gap: 4, background: COLORS.bg, borderRadius: 10, padding: 3 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} className="pbe-btn" onClick={() => onChange(o.value)}
            style={{ flex: 1, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500,
              background: on ? COLORS.surface : 'transparent', color: on ? COLORS.text : COLORS.textMuted,
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldEditor({ field, value, onChange, id }) {
  if (field.kind === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.text, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} style={label}>{field.label}</label>
      {field.kind === 'segment' && <Segment options={field.options} value={value} onChange={onChange} ariaLabel={field.label} />}
      {field.kind === 'select' && (
        <select id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input}>
          {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {field.kind === 'number' && (
        <input id={id} type="number" min={field.min} max={field.max} value={value ?? ''} style={input}
          onChange={e => onChange(e.target.value === '' ? '' : Math.max(field.min, Math.min(field.max, Number(e.target.value))))} />
      )}
      {field.kind === 'text' && (
        <input id={id} type="text" maxLength={field.max} value={value ?? ''} placeholder={field.placeholder} style={input}
          onChange={e => onChange(e.target.value)} />
      )}
      {field.kind === 'textarea' && (
        <>
          <textarea id={id} maxLength={field.max} value={value ?? ''} rows={5} style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
            onChange={e => onChange(e.target.value)} />
          <div style={{ textAlign: 'right', fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{(value || '').length} / {field.max}</div>
        </>
      )}
    </div>
  );
}

/**
 * 포트폴리오 "직접 구성" 편집 화면 (`/portfolio-builder`, 보호 · Standalone) — PLANNING_portfolio-blocks.md 4절.
 * 미리보기는 공개 페이지와 같은 TemplateBlocks를 그대로 쓴다.
 */
export default function PortfolioBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const narrow = useIsNarrow();
  const profileName = user?.profileName;

  const [data, setData] = useState(null);
  const [blocks, setBlocks] = useState(null);       // null = 아직 시작 안 함(출발점 고르기)
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [selectedId, setSelectedId] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);     // { type: 'ok'|'error', text }
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!profileName) return;
    let cancelled = false;
    Promise.allSettled([apiClient.get(`/portfolio/${profileName}`), apiClient.get(`/portfolio/${profileName}/config`)])
      .then(([p, c]) => {
        if (cancelled) return;
        if (p.status === 'fulfilled') setData(p.value.data);
        else setLoadError(p.reason?.response?.data?.message || '포트폴리오를 불러오지 못했어요.');
        const cfg = c.status === 'fulfilled' ? c.value.data : null;
        const saved = parseSections(cfg?.sectionsJson);
        if (saved && saved.length) { setBlocks(saved); setSelectedId(saved[0].id); }
        setStyle(parseStyle(cfg?.styleJson));
      });
    return () => { cancelled = true; };
  }, [profileName]);

  // 저장 전 이탈 경고
  useEffect(() => {
    if (!dirty) return undefined;
    const fn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);

  const change = (next) => { setBlocks(next); setDirty(true); setMessage(null); };
  const changeStyle = (patch) => { setStyle(s => ({ ...s, ...patch })); setDirty(true); setMessage(null); };

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };
  const toggle = (id) => change(blocks.map(b => (b.id === id ? { ...b, visible: !b.visible } : b)));
  const duplicate = (i) => {
    if (blocks.length >= MAX_BLOCKS) return;
    const copy = { ...blocks[i], id: newBlockId(), props: { ...blocks[i].props } };
    const next = [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
    change(next); setSelectedId(copy.id);
  };
  const remove = (i) => {
    const b = blocks[i];
    if (!window.confirm(`"${BLOCK_REGISTRY[b.type]?.label || b.type}" 블록을 삭제할까요?`)) return;
    const next = blocks.filter((_, k) => k !== i);
    change(next);
    if (selectedId === b.id) setSelectedId(next[Math.min(i, next.length - 1)]?.id ?? null);
  };
  const add = (type) => {
    if (blocks.length >= MAX_BLOCKS) return;
    const b = { id: newBlockId(), type, visible: true, props: { ...BLOCK_REGISTRY[type].defaults } };
    const at = Math.max(blocks.findIndex(x => x.id === selectedId), -1) + 1 || blocks.length;
    const next = [...blocks.slice(0, at), b, ...blocks.slice(at)];
    change(next); setSelectedId(b.id); setCatalogOpen(false);
  };
  const setProp = (id, key, value) => change(blocks.map(b => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)));
  const startWith = (preset) => { const bs = preset.build(); setBlocks(bs); setSelectedId(bs[0].id); setDirty(true); };

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      const res = await apiClient.put(`/portfolio/${profileName}/template`, {
        template: 'BLOCKS', sectionsJson: serializeSections(blocks), styleJson: serializeStyle(style),
      });
      const normalized = parseSections(res.data?.sectionsJson);
      if (normalized) setBlocks(normalized);       // 서버가 정리한 값(태그 제거·범위)으로 맞춘다
      setStyle(parseStyle(res.data?.styleJson));
      setDirty(false);
      setMessage({ type: 'ok', text: '저장했어요. 공개 포트폴리오에 바로 반영됐어요.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setSaving(false);
    }
  };

  const selected = blocks?.find(b => b.id === selectedId);
  const selectedDef = selected && BLOCK_REGISTRY[selected.type];
  const previewProps = useMemo(() => ({
    member: data?.member, photos: data?.photos || [], series: data?.series || [], profileName,
    acceptingBookings: data?.acceptingBookings, photoCount: data?.photoCount, followerCount: data?.followerCount, totalLikes: data?.totalLikes,
  }), [data, profileName]);

  if (!profileName) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...card, maxWidth: 420, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>포트폴리오 주소가 필요해요</div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>프로필 › 설정에서 포트폴리오 주소를 먼저 정해 주세요.</div>
          <Button onClick={() => navigate('/profile')}>프로필로 가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <style>{`
        .pbe-btn { transition: transform 0.12s ease-out, background 0.15s ease; }
        .pbe-btn:active { transform: scale(0.97); }
        .pbe-btn:focus-visible, .pbe-row:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
        .pbe-row:hover { background: #F9FAFB; }
        .pbe-icon { width: 30px; height: 30px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; color: ${COLORS.textSecondary}; }
        .pbe-icon:hover:not(:disabled) { background: ${COLORS.bg}; }
        .pbe-icon:disabled { opacity: 0.3; cursor: default; }
      `}</style>

      {/* 상단 바 */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, height: 56, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', paddingTop: 'env(safe-area-inset-top)' }}>
        <Link to="/profile" style={{ fontSize: 14, color: COLORS.textSecondary, textDecoration: 'none', whiteSpace: 'nowrap' }}>← {narrow ? '' : '프로필'}</Link>
        <h1 style={{ flex: 1, fontSize: 16, fontWeight: 800, color: COLORS.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>포트폴리오 구성</h1>
        <a href={`/portfolio/${profileName}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: COLORS.textSecondary, textDecoration: 'none', whiteSpace: 'nowrap', padding: '0 8px' }}>
          {narrow ? '보기 ↗' : '공개 페이지 보기 ↗'}
        </a>
        <Button size="sm" onClick={save} loading={saving} disabled={!blocks || !dirty || saving}>
          {saving ? '저장 중' : narrow ? '저장' : '저장하고 공개'}
        </Button>
      </header>

      {message && (
        <div role={message.type === 'error' ? 'alert' : 'status'} style={{ maxWidth: 1400, margin: '12px auto 0', padding: '0 16px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: message.type === 'error' ? COLORS.dangerTonal : COLORS.successTonal,
            color: message.type === 'error' ? COLORS.danger : COLORS.successText }}>
            {message.text}
            {message.type === 'ok' && <> · <a href={`/portfolio/${profileName}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>보러 가기</a></>}
          </div>
        </div>
      )}
      {loadError && <div role="alert" style={{ maxWidth: 1400, margin: '12px auto 0', padding: '0 16px', color: COLORS.danger, fontSize: 13 }}>{loadError}</div>}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16, display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>
        {/* 왼쪽 패널 */}
        <aside style={{ width: narrow ? '100%' : 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
          position: narrow ? 'static' : 'sticky', top: 72, maxHeight: narrow ? 'none' : 'calc(100vh - 88px)', overflowY: narrow ? 'visible' : 'auto' }}>

          {blocks === null ? (
            <div style={card}>
              <h2 style={sectionTitle}>어떤 페이지로 시작할까요?</h2>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '0 0 12px', lineHeight: 1.6 }}>
                출발점을 고르면 블록이 채워져요. 그다음 순서·내용·스타일을 자유롭게 바꾸면 돼요.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STARTER_PRESETS.map(p => (
                  <button key={p.key} type="button" className="pbe-btn pbe-row" onClick={() => startWith(p)}
                    style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: 14, borderRadius: 12,
                      border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer' }}>
                    <span aria-hidden="true" style={{ fontSize: 24 }}>{p.emoji}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: COLORS.text }}>{p.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{p.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 블록 목록 */}
              <div style={card}>
                <h2 style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between' }}>
                  <span>블록</span>
                  <span style={{ fontWeight: 500, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{blocks.length} / {MAX_BLOCKS}</span>
                </h2>
                {blocks.length === 0 && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 8px' }}>블록이 없어요. 아래에서 추가하세요.</p>}
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {blocks.map((b, i) => {
                    const def = BLOCK_REGISTRY[b.type];
                    const on = b.id === selectedId;
                    const props = { ...def?.defaults, ...b.props };
                    return (
                      <li key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 10, padding: '4px 4px 4px 0',
                        background: on ? COLORS.primaryLight : 'transparent', boxShadow: on ? `inset 3px 0 0 ${COLORS.primary}` : 'none',
                        opacity: b.visible ? 1 : 0.55 }}>
                        <button type="button" className="pbe-row" onClick={() => setSelectedId(b.id)} aria-current={on ? 'true' : undefined}
                          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', border: 'none', borderRadius: 8,
                            background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                          <span aria-hidden="true" style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{def?.emoji || '?'}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.text }}>{def?.label || b.type}</span>
                            <span style={{ display: 'block', fontSize: 11, color: COLORS.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.visible ? (def?.summary?.(props) || def?.desc) : '숨김'}
                            </span>
                          </span>
                        </button>
                        <button type="button" className="pbe-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${def?.label} 위로`}>↑</button>
                        <button type="button" className="pbe-icon" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`${def?.label} 아래로`}>↓</button>
                        <button type="button" className="pbe-icon" onClick={() => toggle(b.id)} aria-label={b.visible ? `${def?.label} 숨기기` : `${def?.label} 보이기`} aria-pressed={!b.visible}>{b.visible ? '👁' : '🚫'}</button>
                        <button type="button" className="pbe-icon" onClick={() => duplicate(i)} disabled={blocks.length >= MAX_BLOCKS} aria-label={`${def?.label} 복제`}>⧉</button>
                        <button type="button" className="pbe-icon" onClick={() => remove(i)} aria-label={`${def?.label} 삭제`} style={{ color: COLORS.danger }}>✕</button>
                      </li>
                    );
                  })}
                </ol>
                <button type="button" className="pbe-btn" onClick={() => setCatalogOpen(o => !o)} disabled={blocks.length >= MAX_BLOCKS} aria-expanded={catalogOpen}
                  style={{ width: '100%', marginTop: 10, height: 40, borderRadius: 10, border: `1.5px dashed ${COLORS.border}`, background: 'transparent',
                    color: COLORS.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {catalogOpen ? '닫기' : '＋ 블록 추가'}
                </button>
                {catalogOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 10 }}>
                    {BLOCK_TYPES.map(type => {
                      const def = BLOCK_REGISTRY[type];
                      return (
                        <button key={type} type="button" className="pbe-btn pbe-row" onClick={() => add(type)}
                          style={{ textAlign: 'left', padding: 10, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, cursor: 'pointer' }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.text }}><span aria-hidden="true">{def.emoji}</span> {def.label}</span>
                          <span style={{ display: 'block', fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 1.4 }}>{def.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 선택한 블록 설정 */}
              {selected && selectedDef && (
                <div style={card}>
                  <h2 style={sectionTitle}><span aria-hidden="true">{selectedDef.emoji}</span> {selectedDef.label} 설정</h2>
                  {selectedDef.fields.length === 0 ? (
                    <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.6 }}>
                      설정할 항목이 없어요. 내용은 프로필 › 설정 › 포트폴리오 콘텐츠에서 관리해요.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {selectedDef.fields.map(f => (
                        <FieldEditor key={f.key} id={`pbe-${selected.id}-${f.key}`} field={f}
                          value={selected.props[f.key] ?? selectedDef.defaults[f.key]}
                          onChange={v => setProp(selected.id, f.key, v)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 페이지 스타일 */}
              <div style={card}>
                <h2 style={sectionTitle}>페이지 스타일</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <span style={label}>강조색</span>
                    <div role="radiogroup" aria-label="강조색" style={{ display: 'flex', gap: 8 }}>
                      {ACCENT_PRESETS.map(c => {
                        const on = style.accent.toUpperCase() === c.toUpperCase();
                        return (
                          <button key={c} type="button" role="radio" aria-checked={on} aria-label={`강조색 ${c}`} className="pbe-btn"
                            onClick={() => changeStyle({ accent: c })}
                            style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                              border: on ? `3px solid ${COLORS.surface}` : 'none', boxShadow: on ? `0 0 0 2px ${c}` : 'none' }} />
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span style={label}>배경</span>
                    <Segment ariaLabel="배경" value={style.background} onChange={v => changeStyle({ background: v })}
                      options={Object.entries(BACKGROUNDS).map(([value, b]) => ({ value, label: b.label }))} />
                  </div>
                  <div>
                    <span style={label}>블록 간격</span>
                    <Segment ariaLabel="블록 간격" value={style.spacing} onChange={v => changeStyle({ spacing: v })}
                      options={Object.entries(SPACINGS).map(([value, s]) => ({ value, label: s.label }))} />
                  </div>
                  <div>
                    <span style={label}>제목 글꼴</span>
                    <Segment ariaLabel="제목 글꼴" value={style.headingFont} onChange={v => changeStyle({ headingFont: v })}
                      options={Object.entries(HEADING_FONTS).map(([value, f]) => ({ value, label: f.label }))} />
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        {/* 미리보기 */}
        <main style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary }}>미리보기</span>
            {!narrow && (
              <div style={{ width: 180 }}>
                <Segment ariaLabel="미리보기 크기" value={device} onChange={setDevice}
                  options={[{ value: 'desktop', label: '데스크탑' }, { value: 'mobile', label: '모바일' }]} />
              </div>
            )}
          </div>
          <div style={{ margin: '0 auto', width: device === 'mobile' && !narrow ? 390 : '100%', maxWidth: '100%', borderRadius: 16, overflow: 'hidden',
            border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', background: COLORS.surface }}>
            {!data ? (
              <div style={{ padding: 48, textAlign: 'center', color: COLORS.textMuted, fontSize: 14 }}>{loadError ? '미리볼 데이터를 불러오지 못했어요.' : '불러오는 중…'}</div>
            ) : (
              <TemplateBlocks {...previewProps} blocks={blocks || []} style={style} preview
                forceNarrow={narrow || device === 'mobile' ? true : undefined}
                selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
