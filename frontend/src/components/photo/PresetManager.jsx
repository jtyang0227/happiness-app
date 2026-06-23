import React, { useState, useRef, useEffect } from 'react';
import { usePresets, MAX_PRESETS } from '../../hooks/usePresets';
import { COLORS } from '../../constants/colors';
import {
  DEFAULT_CHANNEL_CURVES,
  DEFAULT_EFFECTS,
  DEFAULT_HSL_ADJUSTMENTS,
  DEFAULT_COLOR_GRADING,
  DEFAULT_SHARPENING,
  DEFAULT_NOISE_REDUCTION,
  DEFAULT_CALIBRATION,
} from '../../hooks/useImageAdjustments';

// ── 8 built-in style presets ────────────────────────────────────────

const BUILTIN_PRESETS = [
  {
    id: '__fuji-velvia',
    name: 'Fuji Velvia',
    adjustments: { exposure: 0.1, contrast: 30, highlights: -10, shadows: 10, whites: 10, blacks: -5, temperature: 5, tint: -5 },
    effects: { ...DEFAULT_EFFECTS, saturation: 40, vibrance: 20 },
  },
  {
    id: '__kodak-portra',
    name: 'Kodak Portra',
    adjustments: { exposure: 0.2, contrast: -10, highlights: -20, shadows: 20, whites: 5, blacks: 5, temperature: 15, tint: 5 },
    effects: { ...DEFAULT_EFFECTS, saturation: -10, vibrance: 15 },
  },
  {
    id: '__matte-fade',
    name: 'Matte Fade',
    adjustments: { exposure: 0.1, contrast: -20, highlights: -10, shadows: 30, whites: -10, blacks: 20, temperature: 0, tint: 0 },
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    id: '__bw-dramatic',
    name: 'B&W Dramatic',
    adjustments: { exposure: 0, contrast: 40, highlights: -30, shadows: -20, whites: 20, blacks: -20, temperature: 0, tint: 0 },
    effects: { ...DEFAULT_EFFECTS, saturation: -100 },
  },
  {
    id: '__golden-hour',
    name: 'Golden Hour',
    adjustments: { exposure: 0.2, contrast: 10, highlights: -20, shadows: 20, whites: 0, blacks: 0, temperature: 35, tint: 10 },
    effects: { ...DEFAULT_EFFECTS, vibrance: 25 },
  },
  {
    id: '__cool-cinematic',
    name: 'Cool Cinematic',
    adjustments: { exposure: -0.1, contrast: 20, highlights: -20, shadows: 10, whites: -5, blacks: 5, temperature: -20, tint: -5 },
    effects: { ...DEFAULT_EFFECTS, saturation: -15 },
  },
  {
    id: '__pastel-dream',
    name: 'Pastel Dream',
    adjustments: { exposure: 0.3, contrast: -25, highlights: -10, shadows: 25, whites: 10, blacks: 20, temperature: 10, tint: 5 },
    effects: { ...DEFAULT_EFFECTS, saturation: -20, vibrance: -10 },
  },
  {
    id: '__vibrant-pop',
    name: 'Vibrant Pop',
    adjustments: { exposure: 0.05, contrast: 25, highlights: -5, shadows: 5, whites: 5, blacks: -5, temperature: 5, tint: 0 },
    effects: { ...DEFAULT_EFFECTS, saturation: 30, vibrance: 40 },
  },
  {
    id: '__y2k-film-snap',
    name: 'Y2K 필름 스냅',
    adjustments: { exposure: -0.20, contrast: 25, highlights: -20, shadows: 20, whites: 35, blacks: -30, temperature: -12, tint: 0 },
    effects: { ...DEFAULT_EFFECTS, vibrance: 30, saturation: 5, texture: -10, clarity: 5, dehaze: -5, vignette: -10, grainAmount: 30, grainSize: 28, grainRoughness: 55 },
    hslAdj: {
      red:     { hue: 15, saturation: 15, luminance: 5 },
      orange:  { hue: -10, saturation: -20, luminance: 15 },
      yellow:  { hue: -35, saturation: -25, luminance: 10 },
      green:   { hue: -60, saturation: -10, luminance: 10 },
      aqua:    { hue: -20, saturation: 25, luminance: -10 },
      blue:    { hue: -15, saturation: 35, luminance: -20 },
      purple:  { hue: 0, saturation: 20, luminance: 0 },
      magenta: { hue: 20, saturation: 20, luminance: 0 },
    },
    colorGrading: {
      shadows:    { hue: 205, saturation: 15 },
      midtones:   { hue: 330, saturation: 8 },
      highlights: { hue: 45,  saturation: 10 },
      blending: 50, balance: -10,
    },
    sharpening: { amount: 35, radius: 1.0, detail: 40 },
    noiseReduction: { luminance: 10, color: 20 },
    calibration: {
      red:   { hue: 20, saturation: 10 },
      green: { hue: -15, saturation: 10 },
      blue:  { hue: -35, saturation: 35 },
    },
  },
];

const makeBuiltinFull = (p) => ({
  ...p,
  channelCurves:  { ...DEFAULT_CHANNEL_CURVES, rgb: [...DEFAULT_CHANNEL_CURVES.rgb], r: [...DEFAULT_CHANNEL_CURVES.r], g: [...DEFAULT_CHANNEL_CURVES.g], b: [...DEFAULT_CHANNEL_CURVES.b] },
  hslAdj:         p.hslAdj        ? JSON.parse(JSON.stringify(p.hslAdj))        : JSON.parse(JSON.stringify(DEFAULT_HSL_ADJUSTMENTS)),
  colorGrading:   p.colorGrading  ? JSON.parse(JSON.stringify(p.colorGrading))  : JSON.parse(JSON.stringify(DEFAULT_COLOR_GRADING)),
  sharpening:     p.sharpening    ? { ...p.sharpening }                         : { ...DEFAULT_SHARPENING },
  noiseReduction: p.noiseReduction ? { ...p.noiseReduction }                    : { ...DEFAULT_NOISE_REDUCTION },
  calibration:    p.calibration   ? JSON.parse(JSON.stringify(p.calibration))   : JSON.parse(JSON.stringify(DEFAULT_CALIBRATION)),
});

// ── XMP Export ──────────────────────────────────────────────────────

function exportAsXmp(preset) {
  const adj = preset.adjustments || {};
  const eff = preset.effects || {};
  const hsl = preset.hslAdj || {};
  const cal = preset.calibration || {};

  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:PresetType="Normal"
      crs:Exposure2012="${(adj.exposure || 0).toFixed(2)}"
      crs:Contrast2012="${(adj.contrast || 0).toFixed(0)}"
      crs:Highlights2012="${(adj.highlights || 0).toFixed(0)}"
      crs:Shadows2012="${(adj.shadows || 0).toFixed(0)}"
      crs:Whites2012="${(adj.whites || 0).toFixed(0)}"
      crs:Blacks2012="${(adj.blacks || 0).toFixed(0)}"
      crs:Temperature="${Math.round(5500 + (adj.temperature || 0) * 100)}"
      crs:Tint="${Math.round((adj.tint || 0) * 1.5)}"
      crs:Vibrance="${(eff.vibrance || 0).toFixed(0)}"
      crs:Saturation="${(eff.saturation || 0).toFixed(0)}"
      crs:Texture="${(eff.texture || 0).toFixed(0)}"
      crs:Clarity2012="${(eff.clarity || 0).toFixed(0)}"
      crs:Dehaze="${(eff.dehaze || 0).toFixed(0)}"
      crs:VignetteAmount="${(eff.vignette || 0).toFixed(0)}"
      crs:GrainAmount="${(eff.grainAmount || 0).toFixed(0)}"
      crs:GrainSize="${(eff.grainSize || 0).toFixed(0)}"
      crs:GrainFrequency="${(eff.grainRoughness || 0).toFixed(0)}"
      crs:HueAdjustmentRed="${(hsl.red?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentRed="${(hsl.red?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentRed="${(hsl.red?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentOrange="${(hsl.orange?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentOrange="${(hsl.orange?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentOrange="${(hsl.orange?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentYellow="${(hsl.yellow?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentYellow="${(hsl.yellow?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentYellow="${(hsl.yellow?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentGreen="${(hsl.green?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentGreen="${(hsl.green?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentGreen="${(hsl.green?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentAqua="${(hsl.aqua?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentAqua="${(hsl.aqua?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentAqua="${(hsl.aqua?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentBlue="${(hsl.blue?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentBlue="${(hsl.blue?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentBlue="${(hsl.blue?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentPurple="${(hsl.purple?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentPurple="${(hsl.purple?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentPurple="${(hsl.purple?.luminance || 0).toFixed(0)}"
      crs:HueAdjustmentMagenta="${(hsl.magenta?.hue || 0).toFixed(0)}"
      crs:SaturationAdjustmentMagenta="${(hsl.magenta?.saturation || 0).toFixed(0)}"
      crs:LuminanceAdjustmentMagenta="${(hsl.magenta?.luminance || 0).toFixed(0)}"
      crs:RedHue="${(cal.red?.hue || 0).toFixed(0)}"
      crs:RedSaturation="${(cal.red?.saturation || 0).toFixed(0)}"
      crs:GreenHue="${(cal.green?.hue || 0).toFixed(0)}"
      crs:GreenSaturation="${(cal.green?.saturation || 0).toFixed(0)}"
      crs:BlueHue="${(cal.blue?.hue || 0).toFixed(0)}"
      crs:BlueSaturation="${(cal.blue?.saturation || 0).toFixed(0)}"
    />
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const blob = new Blob([xmp], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name || 'preset'}.xmp`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Styles ──────────────────────────────────────────────────────────

const S = {
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 8px', borderRadius: 8, marginBottom: 4,
    background: '#0d0d22', border: '1px solid #1a1a38',
  },
  builtinRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 8px', borderRadius: 8, marginBottom: 3,
    background: '#0a0a1e', border: '1px solid #141430',
  },
  indexBadge: {
    fontSize: 10, fontWeight: 700, color: '#404060',
    minWidth: 14, textAlign: 'center', flexShrink: 0,
  },
  nameText: {
    flex: 1, fontSize: 12, color: '#c0c0e0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  builtinName: {
    flex: 1, fontSize: 12, color: '#8888b0', fontStyle: 'italic',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nameInput: {
    flex: 1, padding: '2px 6px', borderRadius: 4,
    border: `1px solid ${COLORS.primary}`,
    background: '#12122a', color: '#eeeeff',
    fontSize: 12, outline: 'none', minWidth: 0,
  },
  applyBtn: {
    padding: '3px 8px', borderRadius: 5,
    border: `1px solid ${COLORS.primary}`,
    background: 'transparent', color: COLORS.primary,
    fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    transition: 'all 0.15s',
  },
  deleteBtn: {
    padding: '3px 7px', borderRadius: 5,
    border: '1px solid #222248',
    background: 'transparent', color: '#555580',
    fontSize: 12, cursor: 'pointer', flexShrink: 0, lineHeight: 1,
  },
  saveInput: {
    flex: 1, padding: '5px 8px', borderRadius: 6,
    border: `1px solid ${COLORS.primary}`,
    background: '#0f0f28', color: '#eeeeff',
    fontSize: 12, outline: 'none', minWidth: 0,
  },
  confirmBtn: {
    padding: '4px 10px', borderRadius: 6,
    border: 'none', background: COLORS.primary,
    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  },
  cancelBtn: {
    padding: '4px 8px', borderRadius: 6,
    border: '1px solid #2a2a50', background: 'none',
    color: '#6060a0', fontSize: 11, cursor: 'pointer', flexShrink: 0,
  },
};

export default function PresetManager({
  adjustments, channelCurves, effects,
  hslAdj, colorGrading, sharpening, noiseReduction, calibration,
  onApply,
}) {
  const { presets, addPreset, removePreset, renamePreset, importPresets, exportPresets } = usePresets();

  const [saving, setSaving]           = useState(false);
  const [newName, setNewName]         = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editingName, setEditingName] = useState('');
  const [toast, setToast]             = useState('');
  const [showBuiltin, setShowBuiltin] = useState(false);

  const saveInputRef  = useRef(null);
  const editInputRef  = useRef(null);
  const importFileRef = useRef(null);

  useEffect(() => { if (saving)    saveInputRef.current?.focus(); }, [saving]);
  useEffect(() => { if (editingId) editInputRef.current?.select(); }, [editingId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const isFull = presets.length >= MAX_PRESETS;

  const handleStartSave = () => {
    if (isFull) { setToast(`프리셋은 최대 ${MAX_PRESETS}개까지 저장할 수 있습니다.`); return; }
    setNewName(`프리셋 ${presets.length + 1}`);
    setSaving(true);
  };

  const handleConfirmSave = () => {
    if (!newName.trim()) return;
    addPreset(newName, adjustments, channelCurves, effects, hslAdj, colorGrading, sharpening, noiseReduction, calibration);
    setSaving(false);
    setNewName('');
    setToast('프리셋이 저장되었습니다.');
  };

  const handleCancelSave = () => { setSaving(false); setNewName(''); };

  const handleStartEdit = (preset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleConfirmEdit = () => {
    if (editingName.trim()) renamePreset(editingId, editingName);
    setEditingId(null);
  };

  const handleApply = (preset) => {
    onApply({
      adjustments:   { ...preset.adjustments },
      channelCurves: {
        rgb: preset.channelCurves.rgb.map(p => ({ ...p })),
        r:   preset.channelCurves.r.map(p => ({ ...p })),
        g:   preset.channelCurves.g.map(p => ({ ...p })),
        b:   preset.channelCurves.b.map(p => ({ ...p })),
      },
      effects:         { ...preset.effects },
      hslAdj:         preset.hslAdj        ? JSON.parse(JSON.stringify(preset.hslAdj))        : null,
      colorGrading:   preset.colorGrading  ? JSON.parse(JSON.stringify(preset.colorGrading))  : null,
      sharpening:     preset.sharpening    ? { ...preset.sharpening }                         : null,
      noiseReduction: preset.noiseReduction ? { ...preset.noiseReduction }                    : null,
      calibration:    preset.calibration   ? JSON.parse(JSON.stringify(preset.calibration))   : null,
    });
    setToast(`"${preset.name}" 적용됨`);
  };

  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'happiness-presets.json';
    a.click();
    URL.revokeObjectURL(url);
    setToast('프리셋을 내보냈습니다.');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importPresets(ev.target.result);
      setToast(ok ? '프리셋을 불러왔습니다.' : '파일 형식이 올바르지 않습니다.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          내 프리셋 ({presets.length}/{MAX_PRESETS})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {presets.length > 0 && (
            <button type="button" onClick={handleExport}
              style={{ fontSize: 10, color: '#5555aa', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            >내보내기</button>
          )}
          <button type="button" onClick={() => importFileRef.current?.click()}
            style={{ fontSize: 10, color: '#5555aa', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
          >불러오기</button>
          <button type="button" onClick={handleStartSave} disabled={saving}
            style={{ fontSize: 11, fontWeight: 700, color: isFull ? '#3a3a6e' : COLORS.primary, background: 'none', border: 'none', cursor: isFull ? 'default' : 'pointer', padding: '2px 4px' }}
          >
            {isFull ? `최대 ${MAX_PRESETS}개` : '+ 저장'}
          </button>
        </div>
      </div>

      <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />

      {/* 저장 인풋 */}
      {saving && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <input
            ref={saveInputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleConfirmSave();
              if (e.key === 'Escape') handleCancelSave();
            }}
            placeholder="프리셋 이름"
            maxLength={20}
            style={S.saveInput}
          />
          <button type="button" onClick={handleConfirmSave} style={S.confirmBtn}>저장</button>
          <button type="button" onClick={handleCancelSave}  style={S.cancelBtn}>취소</button>
        </div>
      )}

      {/* 빈 상태 */}
      {presets.length === 0 && !saving && (
        <div style={{ fontSize: 11, color: '#3a3a5a', textAlign: 'center', padding: '8px 0 4px' }}>
          저장된 프리셋이 없습니다
        </div>
      )}

      {/* 내 프리셋 목록 */}
      {presets.map((preset, idx) => (
        <div key={preset.id} style={S.row}>
          <span style={S.indexBadge}>{idx + 1}</span>
          {editingId === preset.id ? (
            <input
              ref={editInputRef}
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleConfirmEdit();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={handleConfirmEdit}
              maxLength={20}
              style={S.nameInput}
            />
          ) : (
            <span
              style={{ ...S.nameText, cursor: 'text' }}
              title="더블클릭으로 이름 수정"
              onDoubleClick={() => handleStartEdit(preset)}
            >
              {preset.name}
            </span>
          )}
          <button type="button" onClick={() => handleApply(preset)} style={S.applyBtn}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.primary; }}
          >적용</button>
          <button type="button" onClick={() => exportAsXmp(preset)} title="XMP로 내보내기"
            style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #222248', background: 'transparent', color: '#555580', fontSize: 10, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#8080c0'; e.currentTarget.style.borderColor = '#4040a0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555580'; e.currentTarget.style.borderColor = '#222248'; }}
          >.xmp</button>
          <button type="button" onClick={() => removePreset(preset.id)} style={S.deleteBtn} title="삭제"
            onMouseEnter={e => { e.currentTarget.style.color = '#e53e3e'; e.currentTarget.style.borderColor = '#e53e3e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555580'; e.currentTarget.style.borderColor = '#222248'; }}
          >×</button>
        </div>
      ))}

      {presets.length > 0 && (
        <div style={{ fontSize: 10, color: '#33335a', marginBottom: 8, textAlign: 'center' }}>
          더블클릭으로 이름 수정
        </div>
      )}

      {/* 기본 제공 프리셋 */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 8, marginBottom: 4 }}
        onClick={() => setShowBuiltin(v => !v)}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#404060', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          기본 스타일 프리셋
        </span>
        <span style={{ fontSize: 10, color: '#404060' }}>{showBuiltin ? '▲' : '▼'}</span>
      </div>

      {showBuiltin && BUILTIN_PRESETS.map(preset => (
        <div key={preset.id} style={S.builtinRow}>
          <span style={{ fontSize: 10, color: '#303050', flexShrink: 0 }}>✦</span>
          <span style={S.builtinName}>{preset.name}</span>
          <button type="button" onClick={() => handleApply(makeBuiltinFull(preset))} style={S.applyBtn}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.primary; }}
          >적용</button>
        </div>
      ))}

      {/* 인라인 토스트 */}
      {toast && (
        <div style={{
          marginTop: 6, padding: '5px 10px', borderRadius: 6,
          background: '#1a2a1a', border: '1px solid #2a4a2a',
          color: '#80d080', fontSize: 11, textAlign: 'center',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
