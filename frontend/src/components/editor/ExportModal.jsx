import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';
import { buildChannelLUTs, renderWithChannelLUTs, applyEffects, generateGrainTile } from '../../hooks/useImageAdjustments';
import { uploadImage } from '../../services/uploadApi';
import { photoApi } from '../../services/api';

const FORMATS  = ['JPG', 'PNG', 'WEBP'];
const SIZES    = [
  { label: '원본',   value: 'original' },
  { label: '1080px', value: 1080 },
  { label: '2048px', value: 2048 },
  { label: '직접 입력', value: 'custom' },
];
const MIME_MAP = { JPG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp' };

/** 보정·변형·오버레이를 적용한 캔버스. size = 긴 변 목표 px 또는 'original' */
function renderEditedCanvas(img, editState, { size }) {
  const { rotate, flip, crop, adjustments, effects, channelCurves, hslAdj, colorGrading, sharpening, noiseReduction, calibration, overlays } = editState;

  let sw = Math.round(img.naturalWidth  * crop.w);
  let sh = Math.round(img.naturalHeight * crop.h);
  const sx = Math.round(img.naturalWidth  * crop.x);
  const sy = Math.round(img.naturalHeight * crop.y);

  const rad = (rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  let dw = Math.round(sw * cos + sh * sin);
  let dh = Math.round(sw * sin + sh * cos);

  // Resize
  if (size !== 'original') {
    const scale = Number(size) / Math.max(dw, dh);
    dw = Math.round(dw * scale);
    dh = Math.round(dh * scale);
    sw = Math.round(sw * scale);
    sh = Math.round(sh * scale);
  }

  let canvas;
  try {
    canvas = new OffscreenCanvas(dw, dh);
  } catch {
    canvas = document.createElement('canvas');
    canvas.width  = dw;
    canvas.height = dh;
  }

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(dw / 2, dh / 2);
  ctx.rotate(rad);
  ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1);

  // Draw cropped, scaled src to temp canvas
  const tmp = document.createElement('canvas');
  tmp.width  = sw; tmp.height = sh;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(img, sx, sy, img.naturalWidth * crop.w, img.naturalHeight * crop.h, 0, 0, sw, sh);

  // Adjustments
  const luts = buildChannelLUTs(adjustments, channelCurves);
  renderWithChannelLUTs(tmp, tCtx.getImageData(0, 0, sw, sh).data, sw, sh, luts);
  applyEffects(tmp, effects, generateGrainTile(), hslAdj, colorGrading, sharpening, noiseReduction, calibration);

  ctx.drawImage(tmp, -sw / 2, -sh / 2);
  ctx.restore();

  // Overlays
  if (overlays?.length) {
    overlays.forEach(ov => {
      if (ov.hidden) return;
      if (ov.type === 'text') {
        ctx.globalAlpha = (ov.opacity ?? 100) / 100;
        ctx.font = `${ov.fontSize ?? 48}px ${ov.fontFamily ?? 'sans-serif'}`;
        ctx.fillStyle = ov.color ?? '#fff';
        if (ov.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; }
        ctx.fillText(ov.text ?? '', (ov.x ?? 0.5) * dw, (ov.y ?? 0.5) * dh);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
  }

  return canvas;
}

function canvasToBlob(canvas, format, quality) {
  const mime = MIME_MAP[format];
  const q    = format === 'PNG' ? 1 : quality / 100;
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mime, quality: q });
  }
  return new Promise(resolve => canvas.toBlob(resolve, mime, q));
}

async function renderExport(img, editState, { size, format, quality }) {
  return canvasToBlob(renderEditedCanvas(img, editState, { size }), format, quality);
}

/* ── 캐러셀 분할 (SCRL 대조, PLANNING_inside-menus-upgrade.md P0-D) ──
 * 가로로 이어지는 캔버스(장 수 × 슬라이드 폭)에 사진을 놓고 슬라이드 단위로 자른다.
 * 사진 1장 = 채우기(cover, 위아래를 잘라 캔버스를 꽉 채움), 여러 장 = 같은 높이로 한 줄에 이어 붙이기(사진 사이 간격 = 여백). */
const CAROUSEL_RATIOS = [
  { key: '4:5', label: '4:5 세로', w: 1080, h: 1350 },
  { key: '1:1', label: '1:1 정사각', w: 1080, h: 1080 },
];
const CAROUSEL_BGS = [
  { key: '#ffffff', label: '흰색' },
  { key: '#111417', label: '검정' },
  { key: '#F2F4F6', label: '회색' },
];
const MIN_SLIDES = 2;
const MAX_SLIDES = 10;   // 10 × 1080 = 10800px — 오래된 모바일 브라우저 캔버스 한계에 가까워 더 늘리지 않는다

/** scale: 1 = 실제 크기(내보내기), 그보다 작으면 미리보기 */
function composeCarousel(sources, { ratio, count, margin, bg }, scale = 1) {
  const W = Math.round(ratio.w * count * scale);
  const H = Math.round(ratio.h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  const pad = Math.round(H * margin);

  if (sources.length === 1) {
    const src = sources[0];
    const boxW = W - pad * 2;
    const boxH = H - pad * 2;
    const k = Math.max(boxW / src.width, boxH / src.height);
    const sw = boxW / k;
    const sh = boxH / k;
    ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, pad, pad, boxW, boxH);
    return canvas;
  }

  const innerH = H - pad * 2;
  const gap = pad;
  const widths = sources.map(src => (src.width * innerH) / src.height);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (sources.length - 1);
  const k = Math.min(1, (W - pad * 2) / total);   // 줄이 캔버스보다 길면 전체를 줄인다
  const h = innerH * k;
  let x = (W - total * k) / 2;
  const y = (H - h) / 2;
  sources.forEach((src, i) => {
    ctx.drawImage(src, x, y, widths[i] * k, h);
    x += widths[i] * k + gap * k;
  });
  return canvas;
}

function sliceSlide(strip, ratio, index) {
  const slide = document.createElement('canvas');
  slide.width = ratio.w;
  slide.height = ratio.h;
  slide.getContext('2d').drawImage(strip, index * ratio.w, 0, ratio.w, ratio.h, 0, 0, ratio.w, ratio.h);
  return slide;
}

export default function ExportModal({ onClose }) {
  const { state, currentImage, currentEditState } = useEditor();
  const { user } = useAuth();
  const [format,   setFormat]   = useState('JPG');
  const [quality,  setQuality]  = useState(92);
  const [sizeOpt,  setSizeOpt]  = useState('original');
  const [customW,  setCustomW]  = useState(1920);
  const [lockRatio, setLockRatio] = useState(true);
  const [filename, setFilename] = useState(() =>
    currentImage?.name?.replace(/\.[^.]+$/, '') ?? 'export'
  );
  const [uploadToGallery, setUploadToGallery] = useState(false);
  const [progress,  setProgress]  = useState('');
  const [working,   setWorking]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [mode, setMode] = useState('single');   // single | carousel
  const [ratioKey, setRatioKey] = useState('4:5');
  const [slideCount, setSlideCount] = useState(3);
  const [marginPct, setMarginPct] = useState(0);
  const [bg, setBg] = useState('#ffffff');
  const [joinAll, setJoinAll] = useState(false);   // 올린 사진 전부 이어 붙이기
  const [previewSources, setPreviewSources] = useState(null);
  const previewRef = useRef(null);

  const exportSize = sizeOpt === 'custom' ? customW : sizeOpt;
  const ratio = CAROUSEL_RATIOS.find(r => r.key === ratioKey);
  const carouselTargets = joinAll && state.images.length > 1 ? state.images : (currentImage ? [currentImage] : []);
  const carouselOpts = { ratio, count: slideCount, margin: marginPct / 100, bg };
  const targetsKey = carouselTargets.map(t => t.id ?? t.objectUrl).join('|');

  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const loadImg = src => new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src     = src;
  });

  /* 캐러셀 미리보기 — 보정 적용은 무거우니 사진이 바뀔 때만 작은 크기로 한 번 렌더링해 두고,
     비율·장 수·여백·배경을 바꿀 때는 그 캔버스로 다시 배치만 한다 */
  useEffect(() => {
    if (mode !== 'carousel' || carouselTargets.length === 0) return undefined;
    let alive = true;
    setPreviewSources(null);
    Promise.all(carouselTargets.map(t => loadImg(t.objectUrl).then(img => renderEditedCanvas(img, t.editState, { size: 900 }))))
      .then(list => { if (alive) setPreviewSources(list); })
      .catch(() => { if (alive) setPreviewSources([]); });
    return () => { alive = false; };
    // 대상 사진 목록(targetsKey)이 바뀔 때만 다시 렌더링한다
  }, [mode, targetsKey]);

  const drawPreview = useCallback(() => {
    const el = previewRef.current;
    if (!el || !previewSources?.length) return;
    const scale = 300 / ratio.h;   // 미리보기 높이 300px(화면에선 150px, 2배 밀도)
    const strip = composeCarousel(previewSources, carouselOpts, scale);
    el.width = strip.width;
    el.height = strip.height;
    const ctx = el.getContext('2d');
    ctx.drawImage(strip, 0, 0);
    const slideW = ratio.w * scale;
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    for (let i = 1; i < slideCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * slideW, 0);
      ctx.lineTo(i * slideW, strip.height);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';   // 흰 배경에서도 보이게 그림자 선을 한 번 더
      ctx.beginPath();
      ctx.moveTo(i * slideW + 2, 0);
      ctx.lineTo(i * slideW + 2, strip.height);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    }
    ctx.restore();
    ctx.font = '700 22px sans-serif';
    for (let i = 0; i < slideCount; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(i * slideW + 10, 10, 34, 30);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(i + 1), i * slideW + (i + 1 >= 10 ? 14 : 21), 33);
    }
    // carouselOpts는 아래 원시 값들로 결정된다
  }, [previewSources, ratioKey, slideCount, marginPct, bg]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  const handleCarousel = async () => {
    if (carouselTargets.length === 0) return;
    setWorking(true); setDone(false);
    try {
      setProgress('캔버스 만드는 중...');
      // 사진 1장은 원본 해상도로 꽉 채우고, 여러 장은 슬라이드 높이(최대 1350px)에 충분한 3000px로 렌더링해 메모리를 아낀다
      const size = carouselTargets.length === 1 ? 'original' : 3000;
      const full = [];
      for (const t of carouselTargets) {
        full.push(renderEditedCanvas(await loadImg(t.objectUrl), t.editState, { size }));
      }
      const strip = composeCarousel(full, carouselOpts, 1);
      const ext = format.toLowerCase();
      for (let i = 0; i < slideCount; i++) {
        setProgress(`${i + 1} / ${slideCount} 저장 중...`);
        const blob = await canvasToBlob(sliceSlide(strip, ratio, i), format, quality);
        downloadBlob(blob, `${filename}_${String(i + 1).padStart(2, '0')}.${ext}`);
        await new Promise(res => setTimeout(res, 300));   // 브라우저가 연속 다운로드를 막지 않도록 간격을 둔다
      }
      setProgress(`✅ ${slideCount}장 다운로드 완료!`);
      setDone(true);
    } catch (err) {
      setProgress(`오류: ${err.message}`);
    } finally {
      setWorking(false);
    }
  };

  const handleSingle = async () => {
    if (!currentImage) return;
    setWorking(true); setProgress('처리 중...');
    try {
      const img  = await loadImg(currentImage.objectUrl);
      const blob = await renderExport(img, currentEditState, { size: exportSize, format, quality });
      const ext  = format.toLowerCase();
      if (uploadToGallery) {
        setProgress('업로드 중...');
        const url = await uploadImage(blob, 'photos');
        await photoApi.create({ imageUrl: url, title: filename, memberId: user?.id });
        setProgress('✅ 갤러리에 업로드 완료!');
      } else {
        downloadBlob(blob, `${filename}.${ext}`);
        setProgress('✅ 다운로드 완료!');
      }
      setDone(true);
    } catch (err) {
      setProgress(`오류: ${err.message}`);
    } finally {
      setWorking(false);
    }
  };

  const handleAll = async () => {
    const images = state.images;
    setWorking(true); setDone(false);
    const ext = format.toLowerCase();
    for (let i = 0; i < images.length; i++) {
      setProgress(`다운로드 중... ${i + 1} / ${images.length}`);
      try {
        const img  = await loadImg(images[i].objectUrl);
        const blob = await renderExport(img, images[i].editState, { size: exportSize, format, quality });
        const name = images[i].name?.replace(/\.[^.]+$/, '') ?? `image_${i + 1}`;
        await new Promise(res => setTimeout(res, 300));
        downloadBlob(blob, `${name}.${ext}`);
      } catch { /* skip */ }
    }
    setProgress('✅ 전체 다운로드 완료!');
    setWorking(false);
    setDone(true);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440, background: COLORS.darkSurface,
          border: `1px solid ${COLORS.darkBorder}`, borderRadius: 16,
          padding: 24, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: COLORS.darkText, fontSize: 16, fontWeight: 800, margin: 0 }}>내보내기</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.darkTextHint, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* 한 장 | 캐러셀 */}
        <div role="tablist" aria-label="내보내기 방식" style={{ display: 'flex', padding: 3, borderRadius: 10, background: COLORS.darkElevated, marginBottom: 18 }}>
          {[{ key: 'single', label: '한 장' }, { key: 'carousel', label: '캐러셀 (여러 장으로 나누기)' }].map(m => (
            <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => { setMode(m.key); setProgress(''); setDone(false); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: mode === m.key ? 700 : 500,
                background: mode === m.key ? COLORS.darkSurface : 'transparent',
                color: mode === m.key ? COLORS.darkText : COLORS.darkTextSub,
              }}>{m.label}</button>
          ))}
        </div>

        {mode === 'carousel' && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: COLORS.darkTextSub, marginBottom: 6 }}>미리보기 · 점선에서 슬라이드가 나뉘어요</div>
            <div style={{ height: 150, borderRadius: 8, background: COLORS.darkBg, overflowX: 'auto', overflowY: 'hidden', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
              {previewSources === null
                ? <div style={{ margin: '0 auto', fontSize: 12, color: COLORS.darkTextHint }}>미리보기 만드는 중…</div>
                : <canvas ref={previewRef} aria-label={`캐러셀 미리보기 ${slideCount}장`} style={{ height: 150, display: 'block', flexShrink: 0, margin: '0 auto' }} />}
            </div>

            {state.images.length > 1 && (
              <Field label="원본">
                <Chips value={joinAll ? 'all' : 'current'} onChange={v => setJoinAll(v === 'all')}
                  items={[{ key: 'current', label: '지금 사진' }, { key: 'all', label: `올린 사진 ${state.images.length}장 이어 붙이기` }]} />
              </Field>
            )}
            <Field label="슬라이드 비율">
              <Chips value={ratioKey} onChange={setRatioKey}
                items={CAROUSEL_RATIOS.map(r => ({ key: r.key, label: `${r.label} · ${r.w}×${r.h}` }))} />
            </Field>
            <Field label="장 수">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StepBtn label="장 수 줄이기" disabled={slideCount <= MIN_SLIDES} onClick={() => setSlideCount(c => Math.max(MIN_SLIDES, c - 1))}>−</StepBtn>
                <span style={{ minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 800, color: COLORS.darkText, fontVariantNumeric: 'tabular-nums' }}>{slideCount}</span>
                <StepBtn label="장 수 늘리기" disabled={slideCount >= MAX_SLIDES} onClick={() => setSlideCount(c => Math.min(MAX_SLIDES, c + 1))}>+</StepBtn>
                <span style={{ fontSize: 11, color: COLORS.darkTextHint }}>최대 {MAX_SLIDES}장</span>
              </div>
            </Field>
            <Field label={`여백 ${marginPct}%`}>
              <input type="range" min="0" max="12" value={marginPct} aria-label="여백"
                onChange={e => setMarginPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer' }} />
            </Field>
            <Field label="배경">
              <div style={{ display: 'flex', gap: 10 }}>
                {CAROUSEL_BGS.map(b => (
                  <button key={b.key} type="button" aria-label={`배경 ${b.label}`} aria-pressed={bg === b.key} title={b.label}
                    onClick={() => setBg(b.key)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: b.key, cursor: 'pointer',
                      border: `2px solid ${bg === b.key ? COLORS.primary : COLORS.darkBorder}`,
                      boxShadow: bg === b.key ? `0 0 0 2px ${COLORS.darkSurface} inset` : 'none',
                    }} />
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Format */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: COLORS.darkTextSub, display: 'block', marginBottom: 6 }}>파일 형식</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {FORMATS.map(f => (
              <button key={f} onClick={() => setFormat(f)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: format === f ? COLORS.primary : COLORS.darkElevated,
                color: format === f ? '#fff' : COLORS.darkText,
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Quality */}
        {format !== 'PNG' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: COLORS.darkTextSub }}>품질</label>
              <span style={{ fontSize: 11, color: COLORS.primary }}>{quality}</span>
            </div>
            <input type="range" min="1" max="100" value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer' }} />
          </div>
        )}

        {/* Size — 캐러셀은 슬라이드 비율이 크기를 정한다 */}
        {mode === 'single' && <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: COLORS.darkTextSub, display: 'block', marginBottom: 6 }}>출력 크기</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SIZES.map(s => (
              <button key={s.value} onClick={() => setSizeOpt(s.value)} style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: sizeOpt === s.value ? COLORS.primary : COLORS.darkElevated,
                color: sizeOpt === s.value ? '#fff' : COLORS.darkText,
              }}>{s.label}</button>
            ))}
          </div>
          {sizeOpt === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input type="number" value={customW} onChange={e => setCustomW(Number(e.target.value))}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12,
                  background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
                  color: COLORS.darkText,
                }} />
              <span style={{ fontSize: 11, color: COLORS.darkTextHint }}>px</span>
            </div>
          )}
        </div>}

        {/* Filename */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: COLORS.darkTextSub, display: 'block', marginBottom: 6 }}>파일명</label>
          <input
            type="text" value={filename} onChange={e => setFilename(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
              background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.darkText, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Upload to gallery — 캐러셀 묶음 업로드는 다음 단계(P1) */}
        {mode === 'single' && <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer', fontSize: 12, color: COLORS.darkTextSub }}>
          <input type="checkbox" checked={uploadToGallery} onChange={e => setUploadToGallery(e.target.checked)} />
          ☁️ 갤러리에 바로 업로드
        </label>}

        {/* Progress */}
        {progress && (
          <div style={{ textAlign: 'center', fontSize: 12, color: done ? '#48bb78' : COLORS.darkTextSub, marginBottom: 12 }}>
            {working && <span style={{ marginRight: 6 }}>⏳</span>}
            {progress}
          </div>
        )}

        {/* Buttons */}
        {mode === 'carousel' ? (
          <button
            onClick={handleCarousel}
            disabled={working || carouselTargets.length === 0 || !previewSources?.length}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: working ? COLORS.darkElevated : COLORS.primary,
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1,
            }}
          >⬇️ {slideCount}장 다운로드</button>
        ) : <>
        <button
          onClick={handleSingle}
          disabled={working || !currentImage}
          style={{
            width: '100%', marginBottom: 8, padding: '12px 0', borderRadius: 10,
            background: working ? COLORS.darkElevated : COLORS.primary,
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1,
          }}
        >⬇️ {uploadToGallery ? '업로드' : '다운로드'}</button>

        {state.images.length > 1 && (
          <button
            onClick={handleAll}
            disabled={working}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.darkText, fontSize: 13, fontWeight: 700,
              cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.7 : 1,
            }}
          >⬇️ 전체 다운로드 ({state.images.length}장)</button>
        )}
        </>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: COLORS.darkTextSub, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Chips({ value, onChange, items }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map(it => (
        <button key={it.key} type="button" aria-pressed={value === it.key} onClick={() => onChange(it.key)} style={{
          padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
          background: value === it.key ? COLORS.primary : COLORS.darkElevated,
          color: value === it.key ? '#fff' : COLORS.darkText,
        }}>{it.label}</button>
      ))}
    </div>
  );
}

function StepBtn({ label, disabled, onClick, children }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.darkBorder}`, background: COLORS.darkElevated,
      color: COLORS.darkText, fontSize: 16, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  );
}
