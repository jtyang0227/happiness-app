import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../contexts/EditorContext';
import { COLORS } from '../../constants/colors';
import LeftPanel   from './LeftPanel';
import CenterCanvas from './CenterCanvas';
import TransformPanel from './panels/TransformPanel';
import AdjustPanel    from './panels/AdjustPanel';
import FilterPanel    from './panels/FilterPanel';
import OverlayPanel   from './panels/OverlayPanel';
import GalleryPanel   from './panels/GalleryPanel';

const TABS = [
  { key: 'transform', label: 'Transform' },
  { key: 'adjust',    label: '보정' },
  { key: 'filter',    label: '필터' },
  { key: 'overlay',   label: '오버레이' },
  { key: 'gallery',   label: '갤러리 저장' },
];

const PANEL_MAP = {
  transform: TransformPanel,
  adjust:    AdjustPanel,
  filter:    FilterPanel,
  overlay:   OverlayPanel,
  gallery:   GalleryPanel,
};

export default function EditorShell({ onExport }) {
  const navigate  = useNavigate();
  const { state, dispatch, currentImage, canUndo, canRedo } = useEditor();
  const { zoom, activeTool, activeTab } = state;
  const fileRef   = useRef(null);
  const [leftOpen, setLeftOpen] = useState(false);

  const handleFiles = files => {
    const arr = Array.from(files).filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    if (state.images.length + arr.length > 100) {
      alert('최대 100장까지 업로드 가능합니다.');
      return;
    }
    if (arr.length > 0) dispatch({ type: 'IMAGES_ADD', files: arr });
  };

  const ActivePanel = PANEL_MAP[activeTab] ?? AdjustPanel;

  /* ── Zoom controls ─────────────────────────────────────── */
  const zoomIn  = () => dispatch({ type: 'ZOOM_SET', zoom: Math.min(5,   zoom + 0.25) });
  const zoomOut = () => dispatch({ type: 'ZOOM_SET', zoom: Math.max(0.1, zoom - 0.25) });
  const fitZoom = () => dispatch({ type: 'ZOOM_SET', zoom: 1 });

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080810', overflow: 'hidden' }}>

      {/* ── Left Panel (PC: 220px fixed; Mobile: slide drawer) ── */}
      <>
        {/* Mobile overlay */}
        {leftOpen && (
          <div
            onClick={() => setLeftOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }}
          />
        )}
        <aside style={{
          width: 220, flexShrink: 0,
          background: '#0c0c18',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          // Mobile
          position: window.innerWidth < 768 ? 'fixed' : 'relative',
          top: 0, left: window.innerWidth < 768 ? (leftOpen ? 0 : -220) : 'auto',
          height: '100%', zIndex: 200,
          transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '14px 14px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', border: 'none', color: 'rgba(160,160,200,0.55)',
                fontSize: 12, cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'color 0.15s',
              }}
            >← 갤러리</button>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(220,220,255,0.80)', letterSpacing: '0.06em' }}>EDITOR</span>
          </div>

          {/* Upload button */}
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 8,
                background: 'linear-gradient(135deg, #5b6ef5, #7c5cfc)',
                border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: '0 2px 12px rgba(91,110,245,0.35)',
                transition: 'opacity 0.15s',
              }}
            >+ 이미지 추가</button>
            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple hidden
              onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* Thumbnail list */}
          <LeftPanel />

          {/* Footer */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(120,120,160,0.50)', letterSpacing: '0.04em' }}>
            {state.images.length}장 로드됨
          </div>
        </aside>
      </>

      {/* ── Center ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          height: 46, flexShrink: 0,
          background: '#0c0c18',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 3, padding: '0 12px',
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setLeftOpen(v => !v)}
            style={{
              display: window.innerWidth < 768 ? 'flex' : 'none',
              alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 7,
              background: 'none', border: 'none',
              color: 'rgba(180,180,220,0.55)', cursor: 'pointer', fontSize: 16,
              marginRight: 4,
            }}
          >☰</button>

          {/* Undo / Redo */}
          {[
            { icon: '↩', action: () => dispatch({ type: 'UNDO' }), enabled: canUndo, title: 'Ctrl+Z' },
            { icon: '↪', action: () => dispatch({ type: 'REDO' }), enabled: canRedo, title: 'Ctrl+Y' },
          ].map(btn => (
            <button
              key={btn.icon}
              onClick={btn.action}
              disabled={!btn.enabled}
              title={btn.title}
              style={{
                width: 30, height: 30, borderRadius: 7, fontSize: 14,
                background: 'none', border: 'none', cursor: btn.enabled ? 'pointer' : 'default',
                color: 'rgba(220,220,255,0.85)', opacity: btn.enabled ? 1 : 0.22,
                transition: 'opacity 0.15s',
              }}
            >{btn.icon}</button>
          ))}

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />

          {/* Tools */}
          {[
            { icon: '✂', tool: 'crop',   title: '크롭' },
            { icon: '↺', tool: 'rotate', title: '회전' },
            { icon: '↔', tool: 'flip',   title: '뒤집기' },
          ].map(t => (
            <button
              key={t.tool}
              onClick={() => {
                dispatch({ type: 'TOOL_SET', tool: t.tool === activeTool ? 'select' : t.tool });
                if (t.tool === 'crop')   dispatch({ type: 'TAB_SET', tab: 'transform' });
                if (t.tool === 'rotate') dispatch({ type: 'TAB_SET', tab: 'transform' });
              }}
              title={t.title}
              style={{
                width: 30, height: 30, borderRadius: 7, fontSize: 14,
                background: activeTool === t.tool ? 'rgba(91,110,245,0.20)' : 'none',
                border: activeTool === t.tool ? '1px solid rgba(91,110,245,0.45)' : '1px solid transparent',
                color: activeTool === t.tool ? '#8899ff' : 'rgba(180,180,220,0.65)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{t.icon}</button>
          ))}

          {/* Zoom controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={zoomOut} style={zoomBtnStyle}>−</button>
            <span style={{
              fontSize: 11, color: 'rgba(160,160,210,0.70)', minWidth: 40, textAlign: 'center',
              letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn}  style={zoomBtnStyle}>+</button>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />
            <button onClick={fitZoom} title="화면 맞춤" style={zoomBtnStyle}>⊡</button>
          </div>
        </div>

        {/* Canvas */}
        <CenterCanvas />
      </div>

      {/* ── Right Panel ────────────────────────────────────── */}
      <aside style={{
        width: 286, flexShrink: 0,
        background: '#0a0a16',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        // Mobile: bottom sheet
        ...(window.innerWidth < 768 ? {
          position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%',
          maxHeight: '52vh', zIndex: 100, borderLeft: 'none',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        } : {}),
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0, padding: '0 4px',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => dispatch({ type: 'TAB_SET', tab: tab.key })}
                style={{
                  flex: 1, padding: '11px 0', background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #7080ff' : '2px solid transparent',
                  color: active ? 'rgba(220,224,255,0.95)' : 'rgba(120,120,160,0.50)',
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                  letterSpacing: '0.03em',
                }}
              >{tab.label}</button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ActivePanel />
        </div>

        {/* Export button */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button
            onClick={onExport}
            disabled={!currentImage}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: currentImage
                ? 'linear-gradient(135deg, #5b6ef5 0%, #7c5cfc 100%)'
                : 'rgba(255,255,255,0.05)',
              border: 'none', color: currentImage ? '#fff' : 'rgba(120,120,160,0.40)',
              fontSize: 13, fontWeight: 700,
              cursor: currentImage ? 'pointer' : 'not-allowed',
              opacity: currentImage ? 1 : 0.7,
              boxShadow: currentImage ? '0 3px 16px rgba(91,110,245,0.40)' : 'none',
              letterSpacing: '0.04em',
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}
          >내보내기</button>
        </div>
      </aside>
    </div>
  );
}

const zoomBtnStyle = {
  width: 28, height: 28, borderRadius: 7, fontSize: 13,
  background: 'none', border: 'none',
  color: 'rgba(180,180,220,0.70)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'color 0.15s',
};
