import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { COLORS } from '../../constants/colors';
import {
  buildChannelLUTs, renderWithChannelLUTs, applyEffects,
  generateGrainTile,
} from '../../hooks/useImageAdjustments';

const CHECKERBOARD_SIZE = 12;

function drawCheckerboard(ctx, w, h) {
  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#888';
  for (let y = 0; y < h; y += CHECKERBOARD_SIZE) {
    for (let x = 0; x < w; x += CHECKERBOARD_SIZE) {
      if ((Math.floor(x / CHECKERBOARD_SIZE) + Math.floor(y / CHECKERBOARD_SIZE)) % 2 === 0) {
        ctx.fillRect(x, y, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
      }
    }
  }
}

export default function CenterCanvas() {
  const { state, dispatch, currentImage, currentEditState } = useEditor();
  const { zoom, panOffset, activeTool } = state;

  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const offscreenRef  = useRef(null); // post-adjustment pixels
  const originalPixelsRef = useRef(null);
  const imgElRef      = useRef(null);
  const grainTileRef  = useRef(null);
  const rafRef        = useRef(null);

  // Crop drag state
  const cropDragRef   = useRef(null); // { handle, startX, startY, startCrop }
  const [cropActive, setCropActive] = useState(false);

  // Pan/space drag
  const spaceDownRef  = useRef(false);
  const panStartRef   = useRef(null);

  // ── Load image ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentImage) {
      originalPixelsRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      const offscreen = document.createElement('canvas');
      offscreen.width  = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0);
      originalPixelsRef.current = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      offscreenRef.current = offscreen;
      if (!grainTileRef.current) grainTileRef.current = generateGrainTile();
      renderCanvas();   // renderCanvas is a stable ref — no stale closure
    };
    img.src = currentImage.objectUrl;
  }, [currentImage?.id, renderCanvas]);

  // Store latest values in refs so renderCanvas never needs to be recreated
  const editStateRef = useRef(currentEditState);
  const zoomRef      = useRef(zoom);
  editStateRef.current = currentEditState;
  zoomRef.current      = zoom;

  // Stable renderCanvas — never recreated, reads from refs
  const renderCanvas = useRef(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas    = canvasRef.current;
      const img       = imgElRef.current;
      const offscreen = offscreenRef.current;
      if (!canvas || !img || !offscreen) return;

      const es = editStateRef.current;
      const zv = zoomRef.current;
      const { rotate, flip, crop } = es;

      const sw = img.naturalWidth  * crop.w;
      const sh = img.naturalHeight * crop.h;
      const sx = img.naturalWidth  * crop.x;
      const sy = img.naturalHeight * crop.y;

      const rad = (rotate * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const dw  = Math.round((sw * cos + sh * sin) * zv);
      const dh  = Math.round((sw * sin + sh * cos) * zv);

      canvas.width  = dw;
      canvas.height = dh;

      const ctx = canvas.getContext('2d');
      drawCheckerboard(ctx, dw, dh);
      ctx.save();
      ctx.translate(dw / 2, dh / 2);
      ctx.rotate(rad);
      ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1);

      const tmp = document.createElement('canvas');
      tmp.width  = sw; tmp.height = sh;
      const tCtx = tmp.getContext('2d');
      tCtx.putImageData(originalPixelsRef.current, -sx, -sy);

      const luts = buildChannelLUTs(es.adjustments, es.channelCurves);
      renderWithChannelLUTs(tmp, tCtx.getImageData(0, 0, sw, sh).data, sw, sh, luts);
      applyEffects(tmp, es.effects, grainTileRef.current, es.hslAdj, es.colorGrading, es.sharpening, es.noiseReduction, es.calibration);

      ctx.drawImage(tmp, -sw * zv / 2, -sh * zv / 2, sw * zv, sh * zv);
      ctx.restore();
      drawOverlays(ctx, es.overlays, dw, dh);
    });
  }).current;

  // ── Re-render when editState or zoom/pan changes ──────────────
  useEffect(() => {
    if (!imgElRef.current || !originalPixelsRef.current) return;
    renderCanvas();
  }, [currentEditState, zoom, panOffset, renderCanvas]);

  function drawOverlays(ctx, overlays, dw, dh) {
    if (!overlays?.length) return;
    overlays.forEach(ov => {
      if (ov.hidden) return;
      if (ov.type === 'text') {
        ctx.globalAlpha = (ov.opacity ?? 100) / 100;
        ctx.font = `${ov.fontSize ?? 48}px ${ov.fontFamily ?? 'sans-serif'}`;
        ctx.fillStyle = ov.color ?? '#ffffff';
        if (ov.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur  = 4;
        }
        ctx.fillText(ov.text ?? '', (ov.x ?? 0.5) * dw, (ov.y ?? 0.5) * dh);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
  }

  // ── Zoom via wheel ────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: 'ZOOM_SET', zoom: zoom + delta });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, dispatch]);

  // ── Keyboard: Space for pan ───────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.code === 'Space') { e.preventDefault(); spaceDownRef.current = e.type === 'keydown'; }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup',   onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  const fitToScreen = () => {
    const container = containerRef.current;
    const img       = imgElRef.current;
    if (!container || !img) return;
    const cw = container.clientWidth  - 40;
    const ch = container.clientHeight - 40;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    dispatch({ type: 'ZOOM_SET', zoom: Math.min(5, Math.max(0.1, scale)) });
    dispatch({ type: 'PAN_SET',  offset: { x: 0, y: 0 } });
  };

  // ── Mouse events (pan) ────────────────────────────────────────
  const onMouseDown = e => {
    if (spaceDownRef.current) {
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };
  const onMouseMove = e => {
    if (panStartRef.current) {
      dispatch({ type: 'PAN_SET', offset: { x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y } });
    }
  };
  const onMouseUp = () => { panStartRef.current = null; };

  // ── Crop overlay ──────────────────────────────────────────────
  const crop = currentEditState?.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const canvasEl   = canvasRef.current;
  const canvasW    = canvasEl?.width  ?? 0;
  const canvasH    = canvasEl?.height ?? 0;

  const cropStyle  = activeTool === 'crop';
  const cropLeft   = crop.x * canvasW;
  const cropTop    = crop.y * canvasH;
  const cropRight  = (crop.x + crop.w) * canvasW;
  const cropBottom = (crop.y + crop.h) * canvasH;

  const iw = currentImage ? imgElRef.current?.naturalWidth  ?? 0 : 0;
  const ih = currentImage ? imgElRef.current?.naturalHeight ?? 0 : 0;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, overflow: 'auto', position: 'relative',
        background: COLORS.galleryBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: spaceDownRef.current ? (panStartRef.current ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {!currentImage ? (
        <div style={{ textAlign: 'center', color: COLORS.darkTextHint }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          <div style={{ fontSize: 14 }}>이미지를 추가하세요</div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
            }}
          />

          {/* Crop overlay */}
          {cropStyle && canvasW > 0 && (
            <svg
              style={{
                position: 'absolute', inset: 0,
                width: canvasW, height: canvasH,
                pointerEvents: 'none',
              }}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
            >
              {/* Dark mask outside crop */}
              <path
                fill="rgba(0,0,0,0.5)"
                fillRule="evenodd"
                d={`M0 0 H${canvasW} V${canvasH} H0 Z M${cropLeft} ${cropTop} H${cropRight} V${cropBottom} H${cropLeft} Z`}
              />
              {/* Crop border */}
              <rect
                x={cropLeft} y={cropTop}
                width={cropRight - cropLeft}
                height={cropBottom - cropTop}
                fill="none"
                stroke={COLORS.primary}
                strokeWidth="2"
              />
              {/* Grid lines (rule of thirds) */}
              {[1, 2].map(i => (
                <React.Fragment key={i}>
                  <line
                    x1={cropLeft + (cropRight - cropLeft) * i / 3}
                    y1={cropTop}
                    x2={cropLeft + (cropRight - cropLeft) * i / 3}
                    y2={cropBottom}
                    stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                  />
                  <line
                    x1={cropLeft}
                    y1={cropTop + (cropBottom - cropTop) * i / 3}
                    x2={cropRight}
                    y2={cropTop + (cropBottom - cropTop) * i / 3}
                    stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                  />
                </React.Fragment>
              ))}
              {/* Corner handles */}
              {[
                [cropLeft,  cropTop],
                [cropRight, cropTop],
                [cropLeft,  cropBottom],
                [cropRight, cropBottom],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="5" fill="#fff" />
              ))}
            </svg>
          )}
        </div>
      )}

      {/* Status bar */}
      {currentImage && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '6px 14px', fontSize: 11, color: COLORS.darkTextSub,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
            {currentImage.name}
          </span>
          {iw > 0 && <span>{iw} × {ih}</span>}
          <span>{Math.round(zoom * 100)}%</span>
          <button
            onClick={fitToScreen}
            style={{
              marginLeft: 'auto', padding: '2px 8px', borderRadius: 6,
              background: COLORS.darkElevated, border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.darkTextSub, fontSize: 10, cursor: 'pointer',
            }}
          >⊡ 화면 맞춤</button>
        </div>
      )}
    </div>
  );
}
