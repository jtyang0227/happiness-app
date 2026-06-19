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

const TABS = [
  { key: 'transform', label: 'Transform' },
  { key: 'adjust',    label: '보정' },
  { key: 'filter',    label: '필터' },
  { key: 'overlay',   label: '오버레이' },
];

const PANEL_MAP = {
  transform: TransformPanel,
  adjust:    AdjustPanel,
  filter:    FilterPanel,
  overlay:   OverlayPanel,
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
    <div style={{ display: 'flex', height: '100vh', background: COLORS.darkBg, overflow: 'hidden' }}>

      {/* ── Left Panel (PC: 220px fixed; Mobile: slide drawer) ── */}
      <>
        {/* Mobile overlay */}
        {leftOpen && (
          <div
            onClick={() => setLeftOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
          />
        )}
        <aside style={{
          width: 220, flexShrink: 0,
          background: COLORS.darkSurface,
          borderRight: `1px solid ${COLORS.darkBorder}`,
          display: 'flex', flexDirection: 'column',
          // Mobile
          position: window.innerWidth < 768 ? 'fixed' : 'relative',
          top: 0, left: window.innerWidth < 768 ? (leftOpen ? 0 : -220) : 'auto',
          height: '100%', zIndex: 200,
          transition: 'left 0.25s ease',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${COLORS.darkBorder}`,
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', border: 'none', color: COLORS.darkTextSub,
                fontSize: 12, cursor: 'pointer', padding: 0,
              }}
            >← 뒤로</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.darkText }}>🖼️ 편집기</span>
          </div>

          {/* Upload button */}
          <div style={{ padding: 10, borderBottom: `1px solid ${COLORS.darkBorder}` }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 8,
                background: COLORS.primary, border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
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
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${COLORS.darkBorder}`, fontSize: 11, color: COLORS.darkTextHint }}>
            {state.images.length}장 선택됨
          </div>
        </aside>
      </>

      {/* ── Center ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          height: 44, flexShrink: 0,
          background: COLORS.darkSurface,
          borderBottom: `1px solid ${COLORS.darkBorder}`,
          display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px',
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setLeftOpen(v => !v)}
            style={{
              display: window.innerWidth < 768 ? 'flex' : 'none',
              alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'none', border: 'none',
              color: COLORS.darkTextSub, cursor: 'pointer', fontSize: 16,
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
                width: 30, height: 30, borderRadius: 6, fontSize: 14,
                background: 'none', border: 'none', cursor: btn.enabled ? 'pointer' : 'default',
                color: COLORS.darkText, opacity: btn.enabled ? 1 : 0.3,
              }}
            >{btn.icon}</button>
          ))}

          <div style={{ width: 1, height: 20, background: COLORS.darkBorder, margin: '0 6px' }} />

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
                width: 30, height: 30, borderRadius: 6, fontSize: 14,
                background: activeTool === t.tool ? `${COLORS.primary}33` : 'none',
                border: activeTool === t.tool ? `1px solid ${COLORS.primary}` : '1px solid transparent',
                color: activeTool === t.tool ? COLORS.primary : COLORS.darkText,
                cursor: 'pointer',
              }}
            >{t.icon}</button>
          ))}

          {/* Zoom controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={zoomOut} style={zoomBtnStyle}>🔍−</button>
            <span style={{ fontSize: 11, color: COLORS.darkTextSub, minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn}  style={zoomBtnStyle}>🔍+</button>
            <button onClick={fitZoom} title="화면 맞춤" style={zoomBtnStyle}>⊡</button>
          </div>
        </div>

        {/* Canvas */}
        <CenterCanvas />
      </div>

      {/* ── Right Panel ────────────────────────────────────── */}
      <aside style={{
        width: 280, flexShrink: 0,
        background: COLORS.darkSurface,
        borderLeft: `1px solid ${COLORS.darkBorder}`,
        display: 'flex', flexDirection: 'column',
        // Mobile: bottom sheet
        ...(window.innerWidth < 768 ? {
          position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%',
          maxHeight: '50vh', zIndex: 100, borderLeft: 'none',
          borderTop: `1px solid ${COLORS.darkBorder}`,
        } : {}),
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${COLORS.darkBorder}`,
          flexShrink: 0,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => dispatch({ type: 'TAB_SET', tab: tab.key })}
                style={{
                  flex: 1, padding: '10px 0', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                  color: active ? '#fff' : COLORS.darkTextSub,
                  fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  transition: 'color 0.15s',
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
        <div style={{ padding: 12, borderTop: `1px solid ${COLORS.darkBorder}`, flexShrink: 0 }}>
          <button
            onClick={onExport}
            disabled={!currentImage}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10,
              background: currentImage ? COLORS.primary : COLORS.darkElevated,
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: currentImage ? 'pointer' : 'not-allowed',
              opacity: currentImage ? 1 : 0.5,
              boxShadow: currentImage ? `0 2px 12px ${COLORS.primary}44` : 'none',
            }}
          >💾 내보내기</button>
        </div>
      </aside>
    </div>
  );
}

const zoomBtnStyle = {
  width: 28, height: 28, borderRadius: 6, fontSize: 12,
  background: 'none', border: 'none',
  color: COLORS.darkText, cursor: 'pointer',
};
