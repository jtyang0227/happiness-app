import React, { useState, useRef } from 'react';
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

async function renderExport(img, editState, { size, format, quality }) {
  const { rotate, flip, crop, adjustments, effects, channelCurves, hslAdj, colorGrading, sharpening, noiseReduction, overlays } = editState;

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
  applyEffects(tmp, effects, generateGrainTile(), hslAdj, colorGrading, sharpening, noiseReduction);

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

  const mime = MIME_MAP[format];
  const q    = format === 'PNG' ? 1 : quality / 100;

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mime, quality: q });
  }
  return new Promise(resolve => canvas.toBlob(resolve, mime, q));
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
  const imgRef = useRef(null);

  const exportSize = sizeOpt === 'custom' ? customW : sizeOpt;

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

        {/* Size */}
        <div style={{ marginBottom: 16 }}>
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
        </div>

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

        {/* Upload to gallery */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer', fontSize: 12, color: COLORS.darkTextSub }}>
          <input type="checkbox" checked={uploadToGallery} onChange={e => setUploadToGallery(e.target.checked)} />
          ☁️ 갤러리에 바로 업로드
        </label>

        {/* Progress */}
        {progress && (
          <div style={{ textAlign: 'center', fontSize: 12, color: done ? '#48bb78' : COLORS.darkTextSub, marginBottom: 12 }}>
            {working && <span style={{ marginRight: 6 }}>⏳</span>}
            {progress}
          </div>
        )}

        {/* Buttons */}
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
      </div>
    </div>
  );
}
