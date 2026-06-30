import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../contexts/EditorContext';
import { useAuth } from '../../../contexts/AuthContext';
import { GalleryMetaContext } from '../../../contexts/GalleryMetaContext';
import { MOOD_COLORS, GENRE_META } from '../../../constants/colors';
import {
  buildChannelLUTs, renderWithChannelLUTs, applyEffects, generateGrainTile,
} from '../../../hooks/useImageAdjustments';
import { uploadImage } from '../../../services/uploadApi';
import { photoApi } from '../../../services/api';

const PAN_TYPES = [
  { value: '', label: '기본 (EDITORIAL)' },
  { value: 'FULL_BLEED', label: '전면 (Full Bleed)' },
  { value: 'SPLIT', label: '분할 (Split)' },
  { value: 'TRIPTYCH', label: '삼면 (Triptych)' },
  { value: 'FEATURE', label: '피처 (Feature)' },
  { value: 'PORTRAIT_FOCUS', label: '인물 포커스' },
  { value: 'FILM_STRIP', label: '필름 스트립' },
];

const RATIO_OPTIONS = [
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
];

async function renderForSave(img, editState) {
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

  let canvas;
  try {
    canvas = new OffscreenCanvas(dw, dh);
  } catch {
    canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
  }

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(dw / 2, dh / 2);
  ctx.rotate(rad);
  ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1);

  const tmp = document.createElement('canvas');
  tmp.width = sw; tmp.height = sh;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(img, sx, sy, img.naturalWidth * crop.w, img.naturalHeight * crop.h, 0, 0, sw, sh);

  const luts = buildChannelLUTs(adjustments, channelCurves);
  renderWithChannelLUTs(tmp, tCtx.getImageData(0, 0, sw, sh).data, sw, sh, luts);
  applyEffects(tmp, effects, generateGrainTile(), hslAdj, colorGrading, sharpening, noiseReduction, calibration);

  ctx.drawImage(tmp, -sw / 2, -sh / 2);
  ctx.restore();

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

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  }
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

export default function GalleryPanel() {
  const navigate = useNavigate();
  const { currentImage, currentEditState } = useEditor();
  const { user } = useAuth();
  const { editId, initialMeta } = useContext(GalleryMetaContext);

  const [form, setForm] = useState({
    title: '',
    description: '',
    colorMood: '',
    imageRatio: '4:3',
    gridColSpan: 6,
    genre: '',
    panType: '',
  });
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (initialMeta) {
      setForm(prev => ({
        ...prev,
        title: initialMeta.title || '',
        description: initialMeta.description || '',
        colorMood: initialMeta.colorMood || '',
        imageRatio: initialMeta.imageRatio || '4:3',
        gridColSpan: initialMeta.gridColSpan || 6,
        genre: initialMeta.genre || '',
        panType: initialMeta.panType || '',
      }));
    }
  }, [initialMeta]);

  const set = (k, v) => { setError(''); setForm(p => ({ ...p, [k]: v })); };

  async function handleSave() {
    if (!currentImage) { setError('저장할 이미지가 없습니다.'); return; }
    if (!form.title.trim()) { setError('제목을 입력하세요.'); return; }

    setSaving(true);
    setError('');
    setDone(false);

    try {
      setProgress('이미지 렌더링 중...');
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = currentImage.objectUrl;
      });
      const blob = await renderForSave(img, currentEditState);

      setProgress('업로드 중...');
      const imageUrl = await uploadImage(blob, 'photos');

      setProgress('저장 중...');
      const payload = {
        imageUrl,
        title: form.title.trim(),
        description: form.description.trim() || null,
        colorMood: form.colorMood || null,
        imageRatio: form.imageRatio || null,
        gridColSpan: form.gridColSpan,
        genre: form.genre || null,
        panType: form.panType || null,
        memberId: user?.id,
      };

      if (editId) {
        await photoApi.update(editId, payload);
      } else {
        await photoApi.create(payload);
      }

      setProgress('✅ 갤러리에 저장됐습니다!');
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || '저장에 실패했습니다.');
      setProgress('');
    } finally {
      setSaving(false);
    }
  }

  const inp = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(220,220,255,0.90)',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const lbl = {
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(120,120,160,0.70)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 5,
  };

  const sec = {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '12px 14px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Current image preview */}
        {currentImage && (
          <div style={{ padding: '10px 14px 0' }}>
            <img
              src={currentImage.objectUrl}
              alt="preview"
              style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
            <div style={{ fontSize: 10, color: 'rgba(120,120,160,0.50)', marginTop: 4, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentImage.name}
            </div>
          </div>
        )}

        {!currentImage && (
          <div style={{ padding: '24px 14px', textAlign: 'center', color: 'rgba(120,120,160,0.50)', fontSize: 12 }}>
            이미지를 먼저 추가하세요
          </div>
        )}

        {/* Title */}
        <div style={sec}>
          <label style={lbl}>제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="사진 제목"
            style={inp}
          />
        </div>

        {/* Description */}
        <div style={sec}>
          <label style={lbl}>설명</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="사진 설명 (선택)"
            rows={3}
            style={{ ...inp, resize: 'none' }}
          />
        </div>

        {/* Genre */}
        <div style={sec}>
          <label style={lbl}>장르</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(GENRE_META).map(([code, meta]) => {
              const active = form.genre === code;
              return (
                <button
                  key={code}
                  onClick={() => set('genre', active ? '' : code)}
                  style={{
                    padding: '4px 7px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                    background: active ? 'rgba(91,110,245,0.30)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? '#5b6ef5' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#a0a8ff' : 'rgba(160,160,200,0.65)',
                    transition: 'all 0.15s',
                  }}
                >{meta.emoji} {meta.label}</button>
              );
            })}
          </div>
        </div>

        {/* Color Mood */}
        <div style={sec}>
          <label style={lbl}>컬러 무드</label>
          <select
            value={form.colorMood}
            onChange={e => set('colorMood', e.target.value)}
            style={{ ...inp, cursor: 'pointer', colorScheme: 'dark' }}
          >
            <option value="">선택 안 함</option>
            {Object.entries(MOOD_COLORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Image Ratio */}
        <div style={sec}>
          <label style={lbl}>이미지 비율</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {RATIO_OPTIONS.map(r => {
              const active = form.imageRatio === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => set('imageRatio', r.value)}
                  style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                    background: active ? 'rgba(91,110,245,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? '#5b6ef5' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#a0a8ff' : 'rgba(160,160,200,0.65)',
                    transition: 'all 0.15s',
                  }}
                >{r.label}</button>
              );
            })}
          </div>
        </div>

        {/* Grid Width */}
        <div style={sec}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <label style={{ ...lbl, marginBottom: 0 }}>그리드 너비</label>
            <span style={{ fontSize: 10, color: 'rgba(91,110,245,0.85)' }}>{form.gridColSpan}/12</span>
          </div>
          <input
            type="range"
            min={1} max={12}
            value={form.gridColSpan}
            onChange={e => set('gridColSpan', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#5b6ef5', cursor: 'pointer' }}
          />
        </div>

        {/* Pan Type */}
        <div style={{ ...sec, borderBottom: 'none' }}>
          <label style={lbl}>판 유형 (매거진)</label>
          <select
            value={form.panType}
            onChange={e => set('panType', e.target.value)}
            style={{ ...inp, cursor: 'pointer', colorScheme: 'dark' }}
          >
            {PAN_TYPES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {error && (
          <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8, lineHeight: 1.4 }}>{error}</div>
        )}
        {progress && (
          <div style={{ fontSize: 11, color: done ? '#10b981' : 'rgba(160,160,200,0.70)', marginBottom: 8 }}>
            {!done && '⏳ '}{progress}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !currentImage}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: (saving || !currentImage)
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #5b6ef5 0%, #7c5cfc 100%)',
            border: 'none',
            color: (saving || !currentImage) ? 'rgba(120,120,160,0.40)' : '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: (saving || !currentImage) ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: (!saving && currentImage) ? '0 3px 16px rgba(91,110,245,0.40)' : 'none',
            letterSpacing: '0.04em',
            transition: 'opacity 0.2s, box-shadow 0.2s',
          }}
        >
          {saving ? '저장 중...' : editId ? '✅ 수정 완료' : '갤러리에 저장'}
        </button>
      </div>
    </div>
  );
}
