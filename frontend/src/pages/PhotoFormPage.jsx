import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import GridSpanPicker from '../components/common/GridSpanPicker';
import ImageAdjustmentPanel from '../components/photo/ImageAdjustmentPanel';
import { MOOD_COLORS, COLORS } from '../constants/colors';
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_CHANNEL_CURVES,
  DEFAULT_EFFECTS,
  buildChannelLUTs,
  renderWithChannelLUTs,
  applyEffects,
  generateGrainTile,
  computeHistogram,
} from '../hooks/useImageAdjustments';

const MOOD_OPTIONS = Object.entries(MOOD_COLORS).map(([key, val]) => ({
  key, label: val.label, dot: val.dot, bg: val.bg,
}));

const RATIO_OPTIONS = [
  { value: '16:9', label: '16:9', hint: '와이드' },
  { value: '4:3',  label: '4:3',  hint: '가로' },
  { value: '1:1',  label: '1:1',  hint: '정사각' },
  { value: '3:4',  label: '3:4',  hint: '세로' },
  { value: '2:3',  label: '2:3',  hint: '세로긴' },
];

const INITIAL_FORM = {
  title: '', description: '', gridColSpan: 6, colorMood: '', imageRatio: '4:3',
};

const WATERMARK_POSITIONS = [
  { value: 'bottomRight', label: '우하단' },
  { value: 'bottomLeft',  label: '좌하단' },
  { value: 'topRight',    label: '우상단' },
  { value: 'topLeft',     label: '좌상단' },
  { value: 'center',      label: '중앙'   },
];

function applyWatermarkToCanvas(canvas, wm) {
  if (!wm.enabled || !wm.text.trim()) return;
  const ctx = canvas.getContext('2d');
  const fontSize = Math.max(14, Math.round(canvas.width * 0.025));
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  const padding = Math.round(fontSize * 1.2);
  const textW = ctx.measureText(wm.text).width;
  let x, y;
  switch (wm.position) {
    case 'topLeft':    x = padding; y = padding + fontSize; break;
    case 'topRight':   x = canvas.width - textW - padding; y = padding + fontSize; break;
    case 'bottomLeft': x = padding; y = canvas.height - padding; break;
    case 'center':     x = (canvas.width - textW) / 2; y = canvas.height / 2 + fontSize / 2; break;
    default:           x = canvas.width - textW - padding; y = canvas.height - padding;
  }
  ctx.fillText(wm.text, x, y);
  ctx.restore();
}

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
});

export default function PhotoFormPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const isEdit      = Boolean(id);

  // ── 폼 상태 ─────────────────────────────────────────────────────────
  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [apiError, setApiError] = useState('');

  // ── 이미지 탭: 'file' | 'url' ────────────────────────────────────
  const [imgMode, setImgMode] = useState('file');
  const [urlInput, setUrlInput] = useState('');

  // ── 파일 업로드 보정 상태 ─────────────────────────────────────────
  const [imageFile, setImageFile]       = useState(null);
  const [adjustments, setAdjustments]   = useState({ ...DEFAULT_ADJUSTMENTS });
  const [channelCurves, setChannelCurves] = useState({
    rgb: [...DEFAULT_CHANNEL_CURVES.rgb],
    r:   [...DEFAULT_CHANNEL_CURVES.r],
    g:   [...DEFAULT_CHANNEL_CURVES.g],
    b:   [...DEFAULT_CHANNEL_CURVES.b],
  });
  const [effects, setEffects]       = useState({ ...DEFAULT_EFFECTS });
  const [histogram, setHistogram]   = useState(null);
  const [watermark, setWatermark]   = useState({ enabled: false, text: '', position: 'bottomRight' });

  const originalPixelsRef = useRef(null);
  const previewCanvasRef  = useRef(null);
  const hiddenCanvasRef   = useRef(null);
  const grainTileRef      = useRef(null);

  // ── 편집 모드: 기존 데이터 로드 ─────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setFetching(true);
      try {
        const all  = await photoApi.getAll();
        const list = Array.isArray(all?.data) ? all.data : Array.isArray(all) ? all : [];
        const found = list.find(p => String(p.id) === String(id));
        if (found) {
          setForm({
            title:       found.title       || '',
            description: found.description || '',
            gridColSpan: found.gridColSpan || 6,
            colorMood:   found.colorMood   || '',
            imageRatio:  found.imageRatio  || '4:3',
          });
          setUrlInput(found.imageUrl || '');
          setImgMode('url');
        }
      } catch {
        setApiError('사진 정보를 불러오는데 실패했습니다.');
      } finally {
        setFetching(false);
      }
    })();
  }, [id, isEdit]);

  // ── 보정값 변경 시 캔버스 리렌더 ────────────────────────────────
  const applyAdjustments = useCallback(() => {
    if (!originalPixelsRef.current || !previewCanvasRef.current) return;
    const { pixels, w, h } = originalPixelsRef.current;
    const luts = buildChannelLUTs(adjustments, channelCurves);
    renderWithChannelLUTs(previewCanvasRef.current, pixels, w, h, luts);
    if (!grainTileRef.current) grainTileRef.current = generateGrainTile();
    applyEffects(previewCanvasRef.current, effects, grainTileRef.current);
    applyWatermarkToCanvas(previewCanvasRef.current, watermark);
  }, [adjustments, channelCurves, effects, watermark]);

  useEffect(() => { applyAdjustments(); }, [applyAdjustments]);

  // ── 파일 선택 ─────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setErrors(prev => ({ ...prev, image: '' }));

    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 2000;
      let dw = img.width, dh = img.height;
      if (dw > MAX_DIM || dh > MAX_DIM) {
        const r = MAX_DIM / Math.max(dw, dh);
        dw = Math.round(dw * r);
        dh = Math.round(dh * r);
      }

      const hc = hiddenCanvasRef.current;
      hc.width = dw; hc.height = dh;
      hc.getContext('2d').drawImage(img, 0, 0, dw, dh);
      const imageData = hc.getContext('2d').getImageData(0, 0, dw, dh);

      originalPixelsRef.current = {
        pixels: new Uint8ClampedArray(imageData.data),
        w: dw,
        h: dh,
      };

      // 히스토그램 계산
      setHistogram(computeHistogram(originalPixelsRef.current.pixels));

      const pc = previewCanvasRef.current;
      pc.width = dw; pc.height = dh;

      const luts = buildChannelLUTs(adjustments, channelCurves);
      renderWithChannelLUTs(pc, originalPixelsRef.current.pixels, dw, dh, luts);
      if (!grainTileRef.current) grainTileRef.current = generateGrainTile();
      applyEffects(pc, effects, grainTileRef.current);
      applyWatermarkToCanvas(pc, watermark);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleAdjust = useCallback((key, value) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleChannelCurveChange = useCallback((ch, pts) => {
    setChannelCurves(prev => ({ ...prev, [ch]: pts }));
  }, []);

  const handleEffect = useCallback((key, value) => {
    setEffects(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyPreset = useCallback(({ adjustments: adj, channelCurves: cc, effects: ef }) => {
    setAdjustments({ ...adj });
    setChannelCurves({
      rgb: cc.rgb.map(p => ({ ...p })),
      r:   cc.r.map(p => ({ ...p })),
      g:   cc.g.map(p => ({ ...p })),
      b:   cc.b.map(p => ({ ...p })),
    });
    setEffects({ ...ef });
  }, []);

  // ── 폼 핸들러 ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = '제목을 입력해주세요.';
    if (imgMode === 'url') {
      if (!urlInput.trim()) errs.image = '이미지 URL을 입력해주세요.';
      else if (!/^https?:\/\/.+/.test(urlInput.trim())) errs.image = '올바른 URL을 입력해주세요.';
    } else {
      if (!imageFile && !isEdit) errs.image = '이미지를 선택해주세요.';
    }
    return errs;
  };

  // ── 제출 ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      if (isEdit) {
        await photoApi.update(id, {
          title:       form.title.trim(),
          description: form.description,
          gridColSpan: form.gridColSpan,
          colorMood:   form.colorMood || null,
          imageRatio:  form.imageRatio,
          imageUrl:    urlInput.trim(),
        });
      } else if (imgMode === 'file' && imageFile) {
        const blob = await new Promise(resolve =>
          previewCanvasRef.current.toBlob(resolve, imageFile.type || 'image/jpeg', 0.92)
        );
        const fd = new FormData();
        fd.append('file',        blob, imageFile.name);
        fd.append('memberId',    String(user?.id ?? 1));
        fd.append('title',       form.title.trim());
        fd.append('description', form.description);
        fd.append('gridColSpan', String(form.gridColSpan));
        fd.append('colorMood',   form.colorMood || '');
        fd.append('imageRatio',  form.imageRatio);
        await photoApi.uploadFile(fd);
      } else {
        await photoApi.create({
          memberId:    user?.id ?? 1,
          title:       form.title.trim(),
          imageUrl:    urlInput.trim(),
          description: form.description,
          gridColSpan: form.gridColSpan,
          colorMood:   form.colorMood || null,
          imageRatio:  form.imageRatio,
        });
      }
      navigate('/');
    } catch (err) {
      setApiError(err.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: COLORS.textSecondary }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 48px' }}>
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: COLORS.textSecondary, fontSize: 14, fontWeight: 600,
          padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ← 뒤로가기
      </button>

      <div style={{ background: COLORS.surface, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 24 }}>
          {isEdit ? '사진 수정' : '사진 등록'}
        </h2>

        {apiError && (
          <div style={{
            background: COLORS.dangerTonal, border: '1px solid #ffcccc',
            borderRadius: 8, padding: '10px 14px', color: COLORS.danger,
            fontSize: 13, marginBottom: 16,
          }}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* 제목 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              제목 <span style={{ color: COLORS.danger }}>*</span>
            </label>
            <input
              type="text" name="title" value={form.title}
              onChange={handleChange} placeholder="사진 제목"
              style={inputStyle(!!errors.title)}
            />
            {errors.title && <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.title}</div>}
          </div>

          {/* 이미지 입력 (탭) */}
          {!isEdit && (
            <div style={{ marginBottom: errors.image ? 4 : 20 }}>
              <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                {['file', 'url'].map(mode => (
                  <button
                    key={mode} type="button"
                    onClick={() => { setImgMode(mode); setErrors(e => ({ ...e, image: '' })); }}
                    style={{
                      flex: 1, padding: '8px', fontSize: 13, fontWeight: 600,
                      background: imgMode === mode ? COLORS.primary : COLORS.surface,
                      color:      imgMode === mode ? '#fff' : COLORS.textSecondary,
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {mode === 'file' ? '📁 파일 업로드' : '🔗 URL 입력'}
                  </button>
                ))}
              </div>

              {imgMode === 'file' ? (
                <div>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    border: `2px dashed ${errors.image ? COLORS.danger : COLORS.border}`,
                    borderRadius: 12, padding: '24px 16px', cursor: 'pointer',
                    background: imageFile ? '#f8f9ff' : COLORS.surface,
                    transition: 'all 0.2s',
                  }}>
                    <span style={{ fontSize: 28 }}>🖼</span>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 600 }}>
                      {imageFile ? imageFile.name : '이미지를 선택하거나 여기에 드롭하세요'}
                    </span>
                    <span style={{ fontSize: 11, color: COLORS.textHint }}>JPG, PNG, WEBP 지원</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>

                  {imageFile && (
                    <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 300, display: 'flex', justifyContent: 'center', background: '#000' }}>
                      <canvas
                        ref={previewCanvasRef}
                        style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  )}

                  {imageFile && (
                    <div style={{ marginTop: 12 }}>
                      <ImageAdjustmentPanel
                        adjustments={adjustments}
                        onAdjust={handleAdjust}
                        channelCurves={channelCurves}
                        onChannelCurveChange={handleChannelCurveChange}
                        effects={effects}
                        onEffect={handleEffect}
                        histogram={histogram}
                        onApplyPreset={handleApplyPreset}
                      />
                    </div>
                  )}

                  {imageFile && (
                    <div style={{
                      marginTop: 12, borderRadius: 12,
                      border: `1px solid ${COLORS.border}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: COLORS.surface,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary }}>
                          🔏 워터마크
                        </span>
                        <button
                          type="button"
                          onClick={() => setWatermark(w => ({ ...w, enabled: !w.enabled }))}
                          style={{
                            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            background: watermark.enabled ? COLORS.primary : COLORS.border,
                            color: watermark.enabled ? '#fff' : COLORS.textSecondary,
                            transition: 'all 0.2s',
                          }}
                        >
                          {watermark.enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      {watermark.enabled && (
                        <div style={{ padding: '10px 14px', borderTop: `1px solid ${COLORS.border}` }}>
                          <input
                            type="text"
                            value={watermark.text}
                            onChange={e => setWatermark(w => ({ ...w, text: e.target.value }))}
                            placeholder="© 이름 또는 저작권 텍스트"
                            style={{ ...inputStyle(false), marginBottom: 10, fontSize: 13 }}
                          />
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {WATERMARK_POSITIONS.map(pos => (
                              <button
                                key={pos.value} type="button"
                                onClick={() => setWatermark(w => ({ ...w, position: pos.value }))}
                                style={{
                                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  border: `1.5px solid ${watermark.position === pos.value ? COLORS.primary : COLORS.border}`,
                                  background: watermark.position === pos.value ? COLORS.primaryLight : '#fff',
                                  color: watermark.position === pos.value ? COLORS.primary : COLORS.textSecondary,
                                  cursor: 'pointer',
                                }}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                    이미지 URL <span style={{ color: COLORS.danger }}>*</span>
                  </label>
                  <input
                    type="url" value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setErrors(prev => ({ ...prev, image: '' })); }}
                    placeholder="https://..."
                    style={inputStyle(!!errors.image)}
                  />
                  {urlInput && /^https?:\/\/.+/.test(urlInput) && (
                    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', maxHeight: 200 }}>
                      <img src={urlInput} alt="미리보기" style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 편집 모드: URL */}
          {isEdit && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                이미지 URL
              </label>
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} style={inputStyle(false)} />
            </div>
          )}

          {errors.image && (
            <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 16, marginTop: -12 }}>
              {errors.image}
            </div>
          )}

          {/* 설명 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              설명
            </label>
            <textarea
              name="description" value={form.description}
              onChange={handleChange}
              placeholder="사진에 대한 설명을 입력하세요..."
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </div>

          {/* 색채 분위기 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
              색채 분위기
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button"
                onClick={() => setForm(prev => ({ ...prev, colorMood: '' }))}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${!form.colorMood ? COLORS.primary : COLORS.border}`,
                  background: !form.colorMood ? COLORS.primaryLight : '#fff',
                  color: !form.colorMood ? COLORS.primary : COLORS.textSecondary,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >없음</button>
              {MOOD_OPTIONS.map(mood => {
                const selected = form.colorMood === mood.key;
                return (
                  <button type="button" key={mood.key}
                    onClick={() => setForm(prev => ({ ...prev, colorMood: mood.key }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', borderRadius: 20,
                      border: `1.5px solid ${selected ? mood.dot : COLORS.border}`,
                      background: selected ? mood.bg : '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, color: COLORS.text,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이미지 비율 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
              이미지 비율
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {RATIO_OPTIONS.map(opt => {
                const [w, h] = opt.value.split(':').map(Number);
                const selected = form.imageRatio === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, imageRatio: opt.value }))}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10,
                      border: `1.5px solid ${selected ? COLORS.primary : COLORS.border}`,
                      background: selected ? COLORS.primaryLight : COLORS.surface,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 6, transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: Math.round(32 * Math.min(1, w / h)),
                      height: Math.round(32 * Math.min(1, h / w)),
                      borderRadius: 3,
                      background: selected ? COLORS.primary : COLORS.border,
                      transition: 'background 0.15s',
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: selected ? COLORS.primary : COLORS.textSecondary }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: 10, color: COLORS.textMuted }}>{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 갤러리 너비 */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
              갤러리 너비
            </label>
            <GridSpanPicker value={form.gridColSpan} onChange={val => setForm(prev => ({ ...prev, gridColSpan: val }))} />
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => navigate(-1)}
              style={{
                flex: 1, padding: '13px', borderRadius: 10,
                border: `1.5px solid ${COLORS.border}`, background: '#fff',
                color: COLORS.textSecondary, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >취소</button>
            <button type="submit" disabled={loading}
              style={{
                flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? '#a0a8e8' : COLORS.primary,
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
              }}
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
