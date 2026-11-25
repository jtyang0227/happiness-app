import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import Button from '../components/common/Button';
import gatheringApi from '../services/gatheringApi';
import { uploadImage } from '../services/uploadApi';

/**
 * SNAPDAY 스토리 편집기 — 9:16(1080×1920). 사진 1~3장 레이아웃, 배경색, 텍스트(추가·크기·끌어 옮기기),
 * 날짜·위치·출사명 스티커, 멤버 태그(@인스타그램 ID) 선택·복사, PNG 저장·공유·스토리 올리기.
 * 인스타그램 자동 멘션은 공식 API로 불가 — 태그 문구를 복사해 사용자가 붙여 넣는다(화면에 안내).
 * 에디터라 중립 다크 예외(DESIGN_PROMPT_snapday-outing.md 6절).
 */

const W = 1080;
const H = 1920;
const BGS = ['#111417', '#ffffff', '#F2F4F6', '#E8F3FF', '#FFF6E5', '#1B2B22'];
type Layout = '1' | '2' | '3';
interface Item { id: string; kind: 'text' | 'date' | 'place' | 'title' | 'tags'; text: string; x: number; y: number; size: number; color: string }
interface Pic { src: string; img: HTMLImageElement; local: boolean }

const uid = () => Math.random().toString(36).slice(2, 9);
const pad = (n: number) => String(n).padStart(2, '0');

function loadImage(src: string, cross: boolean): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    if (cross) img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('이미지를 불러오지 못했어요.'));
    img.src = src;
  });
}

/** 사진을 칸에 꽉 채워(cover) 그린다 */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function slots(layout: Layout, n: number) {
  const m = 48;
  const g = 24;
  if (layout === '1' || n <= 1) return [[0, 0, W, H, 0]];
  if (layout === '2' || n === 2) return [[m, m, W - 2 * m, (H - 2 * m - g) / 2, 28], [m, m + (H - 2 * m - g) / 2 + g, W - 2 * m, (H - 2 * m - g) / 2, 28]];
  const topH = (H - 2 * m - g) * 0.6;
  const botH = H - 2 * m - g - topH;
  const half = (W - 2 * m - g) / 2;
  return [[m, m, W - 2 * m, topH, 28], [m, m + topH + g, half, botH, 28], [m + half + g, m + topH + g, half, botH, 28]];
}

/** 캔버스에 전부 그린다 — 미리보기와 저장이 같은 함수를 쓴다 */
function render(ctx: CanvasRenderingContext2D, bg: string, layout: Layout, pics: Pic[], items: Item[]) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const ss = slots(layout, pics.length);
  pics.slice(0, ss.length).forEach((p, i) => {
    const [x, y, w, h, r] = ss[i];
    drawCover(ctx, p.img, x, y, w, h, r);
  });
  for (const it of items) {
    if (!it.text.trim()) continue;
    const size = it.size;
    ctx.font = `700 ${size}px -apple-system, "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const lines = it.text.split('\n').slice(0, 6);
    const lh = size * 1.25;
    const cx = it.x * W;
    const cy = it.y * H;
    const pill = it.kind !== 'text' && it.kind !== 'title';
    if (pill) {
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const pw = tw + size * 1.2;
      const ph = lh * lines.length + size * 0.6;
      ctx.fillStyle = it.color === '#ffffff' ? 'rgba(17,20,23,0.72)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2 > 40 ? 40 : ph / 2);
      ctx.fill();
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = size * 0.25;
    }
    ctx.fillStyle = it.color;
    lines.forEach((l, i) => ctx.fillText(l, cx, cy - ((lines.length - 1) * lh) / 2 + i * lh));
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}

export default function GatheringStoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [gathering, setGathering] = useState<any>(null);
  const [gPhotos, setGPhotos] = useState<any[]>([]);
  const [pics, setPics] = useState<Pic[]>([]);
  const [layout, setLayout] = useState<Layout>('1');
  const [bg, setBg] = useState(BGS[0]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'photo' | 'layout' | 'text' | 'sticker' | 'tag'>('photo');
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const [tagError, setTagError] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    gatheringApi.getDetail(id).then((g: any) => setGathering(g?.data || g)).catch(() => setError('출사 정보를 불러오지 못했어요.'));
    gatheringApi.getBest(id).then((b: any) => setGPhotos(b.photos || [])).catch(() => setGPhotos([]));
    gatheringApi.getInstagramCandidates(id).then(setCandidates).catch((e: any) => { setCandidates([]); setTagError(e?.response?.data?.message || '참여자 목록을 불러오지 못했어요.'); });
  }, [id]);

  // 첫 진입 — 출사명 스티커 기본
  useEffect(() => {
    if (gathering && items.length === 0) {
      setItems([{ id: uid(), kind: 'title', text: gathering.title, x: 0.5, y: 0.86, size: 72, color: '#ffffff' }]);
    }
  }, [gathering]); // eslint-disable-line react-hooks/exhaustive-deps

  // 사진이 늘면 그 수에 맞는 레이아웃으로(여러 장을 한 번에 골라도 마지막 수 기준) — 줄일 때는 사용자가 고른 레이아웃 유지
  const prevCount = useRef(0);
  useEffect(() => {
    if (pics.length > prevCount.current) setLayout(String(Math.min(pics.length, 3)) as Layout);
    prevCount.current = pics.length;
  }, [pics.length]);

  const tagText = (candidates ?? []).filter((c) => tagIds.includes(c.memberId)).map((c) => `@${c.instagramId}`).join(' ');

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!ctx) return;
    render(ctx, bg, layout, pics, items);
  }, [bg, layout, pics, items]);

  const addPic = async (src: string, local: boolean) => {
    if (pics.length >= 3) { setError('사진은 3장까지 넣을 수 있어요. 먼저 빼 주세요.'); return; }
    setError('');
    try {
      const img = await loadImage(src, !local);
      setPics((p) => (p.length >= 3 ? p : [...p, { src, img, local }]));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    [...files].slice(0, 3 - pics.length).forEach((f) => {
      if (!f.type.startsWith('image/')) return;
      addPic(URL.createObjectURL(f), true);
    });
  };

  const addItem = (kind: Item['kind']) => {
    const d = gathering?.startDateTime ? new Date(`${gathering.startDateTime}Z`) : new Date();
    const text = kind === 'date' ? `📅 ${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`
      : kind === 'place' ? `📍 ${gathering?.spotName || gathering?.location || '장소'}`
      : kind === 'title' ? (gathering?.title || '출사')
      : kind === 'tags' ? (tagText || '@태그')
      : '텍스트를 입력하세요';
    const it: Item = { id: uid(), kind, text, x: 0.5, y: kind === 'date' ? 0.08 : kind === 'place' ? 0.14 : kind === 'tags' ? 0.93 : 0.5, size: kind === 'text' ? 80 : 44, color: kind === 'text' ? '#ffffff' : '#191F28' };
    setItems((l) => [...l, it]);
    setSelected(it.id);
    if (kind === 'text') setTab('text');
  };

  const update = (itemId: string, patch: Partial<Item>) => setItems((l) => l.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));

  // 미리보기 위 끌어 옮기기 — 위치는 0~1 비율로 저장해 저장 이미지와 같게
  const pointer = useCallback((e: React.PointerEvent, it?: Item) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (e.type === 'pointerdown' && it) {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      drag.current = { id: it.id, dx: px - it.x, dy: py - it.y };
      setSelected(it.id);
    } else if (e.type === 'pointermove' && drag.current) {
      const d = drag.current;
      update(d.id, { x: Math.min(0.97, Math.max(0.03, px - d.dx)), y: Math.min(0.98, Math.max(0.02, py - d.dy)) });
    } else if (e.type === 'pointerup' || e.type === 'pointercancel') {
      drag.current = null;
    }
  }, []);

  const toBlob = (): Promise<Blob> => new Promise((ok, fail) => {
    try {
      canvasRef.current!.toBlob((b) => (b ? ok(b) : fail(new Error('이미지를 만들지 못했어요.'))), 'image/png');
    } catch {
      fail(new Error('외부 주소 사진이라 이미지로 저장할 수 없어요. "내 기기에서" 사진을 골라 주세요.'));
    }
  });

  const save = async () => {
    setBusy('save'); setError(''); setNotice('');
    try {
      const blob = await toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `snapday-story-${id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setNotice('이미지를 저장했어요.');
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };

  const share = async () => {
    setBusy('share'); setError(''); setNotice('');
    try {
      const blob = await toBlob();
      const file = new File([blob], `snapday-story-${id}.png`, { type: 'image/png' });
      const text = [gathering?.title, tagText].filter(Boolean).join(' ');
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        setNotice('공유 창을 열었어요. 인스타그램을 고른 뒤 태그 문구를 붙여 넣어 주세요.');
      } else {
        setError('이 브라우저는 이미지 공유를 지원하지 않아요. "이미지 저장" 후 인스타그램에서 올려 주세요.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e.message || '공유하지 못했어요.');
    } finally { setBusy(''); }
  };

  const post = async () => {
    setBusy('post'); setError(''); setNotice('');
    try {
      const blob = await toBlob();
      const url = await uploadImage(new File([blob], 'story.png', { type: 'image/png' }), 'stories');
      await gatheringApi.createStory(id, { imageUrl: url, caption: gathering?.title, taggedMemberIds: tagIds });
      navigate(`/gatherings/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || '스토리를 올리지 못했어요.');
    } finally { setBusy(''); }
  };

  const copyTags = async () => {
    if (!tagText) return;
    try { await navigator.clipboard.writeText(tagText); setNotice('태그 문구를 복사했어요.'); } catch { setError('복사하지 못했어요. 문구를 길게 눌러 직접 복사해 주세요.'); }
  };

  const sel = items.find((i) => i.id === selected);
  const tabs: [typeof tab, string][] = [['photo', '사진'], ['layout', '레이아웃'], ['text', '텍스트'], ['sticker', '스티커'], ['tag', '태그']];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.darkBg, color: COLORS.darkText, paddingBottom: 120 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${COLORS.darkBorder}` }}>
        <button onClick={() => navigate(`/gatherings/${id}`)} style={{ background: 'none', border: 'none', color: COLORS.darkText, fontSize: 15, cursor: 'pointer' }}>← 출사로</button>
        <strong style={{ fontSize: 15 }}>스토리 만들기</strong>
        <span style={{ width: 56 }} />
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
        {/* 미리보기 */}
        <div ref={stageRef} onPointerMove={(e) => pointer(e)} onPointerUp={(e) => pointer(e)} onPointerCancel={(e) => pointer(e)}
          style={{ position: 'relative', width: 'min(360px, 100%)', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: '#000', touchAction: 'none', flex: '0 0 auto' }}>
          <canvas ref={canvasRef} width={W} height={H} aria-label="스토리 미리보기" style={{ width: '100%', height: '100%', display: 'block' }} />
          {pics.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.darkTextSub, fontSize: 14, pointerEvents: 'none', textAlign: 'center', padding: 24 }}>
              아래 "사진"에서 출사 사진을 골라 주세요
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} role="button" tabIndex={0} aria-label={`${it.text} — 끌어서 옮기기`}
              onPointerDown={(e) => pointer(e, it)} onClick={() => setSelected(it.id)}
              style={{ position: 'absolute', left: `${it.x * 100}%`, top: `${it.y * 100}%`, transform: 'translate(-50%, -50%)', minWidth: 40, minHeight: 28,
                width: '70%', height: `${Math.max(4, (it.size * 1.4 * it.text.split('\n').length) / H * 100)}%`, cursor: 'move',
                outline: selected === it.id ? `2px dashed ${COLORS.accent}` : 'none', borderRadius: 8 }} />
          ))}
        </div>

        {/* 도구 */}
        <div style={{ flex: '1 1 320px', maxWidth: 480, minWidth: 0 }}>
          <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
            {tabs.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                style={{ flex: '1 0 auto', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: tab === k ? COLORS.darkElevated : 'transparent', color: tab === k ? COLORS.darkText : COLORS.darkTextSub }}>{label}</button>
            ))}
          </div>

          <div style={{ background: COLORS.darkSurface, border: `1px solid ${COLORS.darkBorder}`, borderRadius: 16, padding: 16 }}>
            {tab === 'photo' && (
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {pics.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={p.src} alt={`선택한 사진 ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />
                      <button aria-label={`사진 ${i + 1} 빼기`} onClick={() => setPics(pics.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: 'none', background: COLORS.danger, color: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>＋ 내 기기에서</Button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
                </div>
                <div style={{ fontSize: 13, color: COLORS.darkTextSub, marginBottom: 8 }}>출사 사진 ({gPhotos.length}) — 최대 3장</div>
                {gPhotos.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: COLORS.darkTextHint }}>아직 올라온 출사 사진이 없어요.</p> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {gPhotos.map((p) => (
                      <button key={p.photoId} onClick={() => addPic(p.imageUrl, false)} aria-label={`${p.memberName}의 사진 넣기`} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                        <img src={p.imageUrl} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'layout' && (
              <div>
                <div style={{ fontSize: 13, color: COLORS.darkTextSub, marginBottom: 8 }}>레이아웃</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['1', '2', '3'] as Layout[]).map((l) => (
                    <button key={l} aria-pressed={layout === l} onClick={() => setLayout(l)}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontSize: 14, border: `1px solid ${layout === l ? COLORS.accent : COLORS.darkBorder}`, background: layout === l ? COLORS.darkElevated : 'transparent', color: COLORS.darkText }}>
                      {l === '1' ? '1장 꽉 채움' : l === '2' ? '2장 위아래' : '3장 1+2'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: COLORS.darkTextSub, marginBottom: 8 }}>배경색</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {BGS.map((c) => (
                    <button key={c} aria-label={`배경 ${c}`} aria-pressed={bg === c} onClick={() => setBg(c)}
                      style={{ width: 36, height: 36, borderRadius: 999, background: c, cursor: 'pointer', border: bg === c ? `3px solid ${COLORS.accent}` : `1px solid ${COLORS.darkBorder}` }} />
                  ))}
                </div>
              </div>
            )}

            {tab === 'text' && (
              <div>
                <Button size="sm" variant="secondary" onClick={() => addItem('text')}>＋ 텍스트 추가</Button>
                {sel ? (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea aria-label="선택한 글자" value={sel.text} maxLength={120} rows={2} onChange={(e) => update(sel.id, { text: e.target.value })}
                      style={{ width: '100%', borderRadius: 10, border: `1px solid ${COLORS.darkBorder}`, background: COLORS.darkElevated, color: COLORS.darkText, padding: 10, fontSize: 14, resize: 'vertical' }} />
                    <label style={{ fontSize: 13, color: COLORS.darkTextSub }}>크기 {sel.size}
                      <input type="range" min={28} max={160} value={sel.size} onChange={(e) => update(sel.id, { size: Number(e.target.value) })} style={{ width: '100%' }} />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['#ffffff', '#191F28', '#3182F6'].map((c) => (
                        <button key={c} aria-label={`글자색 ${c}`} aria-pressed={sel.color === c} onClick={() => update(sel.id, { color: c })}
                          style={{ width: 32, height: 32, borderRadius: 999, background: c, cursor: 'pointer', border: sel.color === c ? `3px solid ${COLORS.accent}` : `1px solid ${COLORS.darkBorder}` }} />
                      ))}
                      <Button size="sm" variant="danger" onClick={() => { setItems(items.filter((i) => i.id !== sel.id)); setSelected(null); }}>지우기</Button>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.darkTextHint }}>미리보기에서 글자를 끌어 위치를 옮길 수 있어요.</p>
                  </div>
                ) : <p style={{ margin: '12px 0 0', fontSize: 13, color: COLORS.darkTextHint }}>미리보기에서 글자나 스티커를 눌러 고치세요.</p>}
              </div>
            )}

            {tab === 'sticker' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" onClick={() => addItem('date')}>📅 날짜</Button>
                <Button size="sm" variant="secondary" onClick={() => addItem('place')}>📍 위치</Button>
                <Button size="sm" variant="secondary" onClick={() => addItem('title')}>🏷 출사명</Button>
              </div>
            )}

            {tab === 'tag' && (
              <div>
                {tagError ? <p style={{ margin: 0, fontSize: 13, color: COLORS.darkTextSub }}>{tagError}</p>
                  : candidates == null ? <p style={{ margin: 0, fontSize: 13, color: COLORS.darkTextSub }}>불러오는 중…</p>
                  : candidates.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: COLORS.darkTextSub }}>인스타그램 ID를 등록한 다른 참여자가 없어요.</p>
                  : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {candidates.map((c) => (
                        <li key={c.memberId}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                            <input type="checkbox" checked={tagIds.includes(c.memberId)} onChange={(e) => setTagIds(e.target.checked ? [...tagIds, c.memberId] : tagIds.filter((t) => t !== c.memberId))} />
                            {c.name} <span style={{ color: COLORS.darkTextSub }}>@{c.instagramId}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: COLORS.darkElevated, fontSize: 14, minHeight: 40, wordBreak: 'break-all' }}>{tagText || '태그할 사람을 고르세요'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" disabled={!tagText} onClick={copyTags}>태그 전체 복사</Button>
                  <Button size="sm" variant="secondary" disabled={!tagText} onClick={() => addItem('tags')}>이미지에 태그 넣기</Button>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 12, color: COLORS.darkTextHint }}>인스타그램 자동 멘션은 지원되지 않아요. 공유 후 인스타그램에서 복사한 태그를 붙여 넣어 주세요.</p>
              </div>
            )}
          </div>

          {error && <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(240,68,82,0.15)', color: '#FF8A94', fontSize: 13 }}>{error}</div>}
          {notice && <div role="status" style={{ marginTop: 12, fontSize: 13, color: '#7FE0B0' }}>{notice}</div>}
        </div>
      </div>

      {/* 하단 고정 동작 */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', background: COLORS.darkSurface, borderTop: `1px solid ${COLORS.darkBorder}`, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="secondary" loading={busy === 'save'} disabled={!!busy || pics.length === 0} onClick={save}>이미지 저장</Button>
        <Button variant="secondary" loading={busy === 'share'} disabled={!!busy || pics.length === 0} onClick={share}>공유하기</Button>
        <Button loading={busy === 'post'} disabled={!!busy || pics.length === 0} onClick={post}>스토리 올리기</Button>
      </div>
    </div>
  );
}
