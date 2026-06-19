import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import EditorShell  from '../components/editor/EditorShell';
import ExportModal  from '../components/editor/ExportModal';
import { photoApi }  from '../services/api';

/* ── Drop Zone ─────────────────────────────────────────────── */
function UploadDropZone() {
  const { state, dispatch } = useEditor();
  const [dragging, setDragging] = useState(false);
  let leaveTimer = null;

  useEffect(() => {
    const onEnter = e => { e.preventDefault(); setDragging(true); };
    const onLeave = e => {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => setDragging(false), 80);
    };
    const onOver  = e => { e.preventDefault(); clearTimeout(leaveTimer); };
    const onDrop  = e => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(f =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 50 * 1024 * 1024
      );
      if (files.length === 0) return;
      if (state.images.length >= 100) { alert('최대 100장까지 업로드 가능합니다.'); return; }
      dispatch({ type: 'IMAGES_ADD', files });
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover',  onOver);
    window.addEventListener('drop',      onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover',  onOver);
      window.removeEventListener('drop',      onDrop);
    };
  }, [dispatch, state.images.length]);

  if (!dragging) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(91,110,245,0.15)',
      border: '3px dashed #5b6ef5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 40, color: '#fff', marginBottom: 12 }}>📁</div>
      <div style={{ fontSize: 22, color: '#fff', fontWeight: 700 }}>이미지를 여기에 드롭하세요</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>JPG · PNG · WEBP, 최대 100장</div>
    </div>
  );
}

/* ── Keyboard shortcuts ────────────────────────────────────── */
function KeyboardHandler({ setExportOpen }) {
  const { dispatch } = useEditor();

  useEffect(() => {
    const onKey = e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'TOOL_SET', tool: 'select' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return null;
}

/* ── beforeunload ──────────────────────────────────────────── */
function BeforeUnloadGuard() {
  const { state } = useEditor();
  useEffect(() => {
    const handler = e => {
      if (state.past.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.past.length]);
  return null;
}

/* ── Auto-load from ?photoId ───────────────────────────────── */
function PhotoLoader() {
  const [params] = useSearchParams();
  const { dispatch } = useEditor();

  useEffect(() => {
    const photoId = params.get('photoId');
    if (!photoId) return;
    (async () => {
      try {
        const res = await photoApi.getOne(photoId);
        const photo = res?.data ?? res;
        const url = photo?.imageUrl;
        if (!url) return;
        const blob = await fetch(url).then(r => r.blob());
        const file = new File([blob], photo.title || 'photo.jpg', { type: blob.type || 'image/jpeg' });
        dispatch({ type: 'IMAGES_ADD', files: [file] });
      } catch { /* ignore */ }
    })();
  }, []);

  return null;
}

/* ── Root Page ─────────────────────────────────────────────── */
export default function ImageEditorPage() {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <EditorProvider>
      <PhotoLoader />
      <KeyboardHandler setExportOpen={setExportOpen} />
      <BeforeUnloadGuard />
      <UploadDropZone />
      <EditorShell onExport={() => setExportOpen(true)} />
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </EditorProvider>
  );
}
