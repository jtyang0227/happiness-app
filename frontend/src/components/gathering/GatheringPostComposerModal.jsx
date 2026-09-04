import React, { useState, useRef } from 'react';
import { COLORS } from '../../constants/colors';
import gatheringApi from '../../services/gatheringApi';
import { uploadImage } from '../../services/uploadApi';

/**
 * GatheringPostComposerModal
 * 모임 피드에 사진+글 게시 모달
 * - 최대 10장 멀티 사진 선택 (파일 input)
 * - uploadImage() per file → imageUrl 획득
 * - 사진별 캡션 입력 (선택)
 * - 게시글 content + hashtags (선택)
 * - 유효성: content OR 사진 최소 1장
 */
export default function GatheringPostComposerModal({ gatheringId, onClose, onSuccess }) {
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  // photos: [{file, preview, progress, caption}]
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const isValid = content.trim().length > 0 || photos.length > 0;

  function handleFilePick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = Math.max(0, 10 - photos.length);
    const accepted = files.slice(0, remaining);
    setPhotos(prev => [
      ...prev,
      ...accepted.map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        progress: 0,
        caption: '',
      })),
    ]);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  function updateCaption(idx, val) {
    setPhotos(prev => prev.map((p, i) => (i === idx ? { ...p, caption: val } : p)));
  }

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // Upload each photo sequentially, updating per-file progress
      const uploadedPhotos = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadImage(photos[i].file, 'gatherings', (prog) => {
          setPhotos(prev =>
            prev.map((p, idx) => (idx === i ? { ...p, progress: prog } : p))
          );
        });
        uploadedPhotos.push({
          imageUrl: url,
          caption: photos[i].caption || undefined,
          sortOrder: i,
        });
      }

      const body = {};
      if (content.trim()) body.content = content.trim();
      if (hashtags.trim()) body.hashtags = hashtags.trim();
      if (uploadedPhotos.length > 0) body.photos = uploadedPhotos;

      await gatheringApi.createPost(gatheringId, body);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || '게시 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  }

  // Close on backdrop click, not on modal body click
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'gpcm-backdrop-in 0.15s ease both',
      }}
    >
      <style>{`
        @keyframes gpcm-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gpcm-sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gpcm-sheet { animation: gpcm-backdrop-in 0.15s ease both !important; transform: none !important; }
        }
      `}</style>
      <div
        className="gpcm-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 600,
          padding: '24px 20px 40px',
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.14)',
          animation: 'gpcm-sheet-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
        }}
      >
        {/* ── 헤더 ───────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
            📸 사진 올리기
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: COLORS.textMuted, lineHeight: 1, padding: 4,
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* ── 게시글 텍스트 ──────────────────────────── */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="모임에서의 순간을 나눠보세요..."
          rows={3}
          disabled={submitting}
          style={{
            width: '100%', padding: '12px', boxSizing: 'border-box',
            border: `1px solid ${COLORS.border}`, borderRadius: 10,
            fontSize: 14, color: COLORS.text, background: COLORS.surface,
            resize: 'none', marginBottom: 12, fontFamily: 'inherit',
            outline: 'none',
          }}
        />

        {/* ── 해시태그 ──────────────────────────────── */}
        <input
          type="text"
          value={hashtags}
          onChange={e => setHashtags(e.target.value)}
          placeholder="#해시태그 #촬영모임 (선택)"
          disabled={submitting}
          style={{
            width: '100%', padding: '10px 12px', boxSizing: 'border-box',
            border: `1px solid ${COLORS.border}`, borderRadius: 10,
            fontSize: 13, color: COLORS.text, background: COLORS.surface,
            marginBottom: 16, outline: 'none',
          }}
        />

        {/* ── 사진 미리보기 그리드 ─────────────────── */}
        {photos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8, marginBottom: 12,
          }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {/* 이미지 */}
                <div style={{
                  aspectRatio: '1', borderRadius: 8,
                  overflow: 'hidden', background: COLORS.surfaceDim,
                  position: 'relative',
                }}>
                  <img
                    src={p.preview}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* 업로드 진행률 오버레이 */}
                  {submitting && p.progress < 100 && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: '#fff', fontWeight: 700,
                    }}>
                      {p.progress}%
                    </div>
                  )}
                  {/* 삭제 버튼 */}
                  {!submitting && (
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.65)', border: 'none',
                        cursor: 'pointer', color: '#fff',
                        fontSize: 11, lineHeight: '22px', textAlign: 'center',
                        padding: 0,
                      }}
                      aria-label="사진 제거"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* 캡션 입력 */}
                <input
                  type="text"
                  value={p.caption}
                  onChange={e => updateCaption(i, e.target.value)}
                  placeholder="캡션 (선택)"
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '5px 6px', boxSizing: 'border-box',
                    border: `1px solid ${COLORS.border}`, borderRadius: 6,
                    fontSize: 11, color: COLORS.text, marginTop: 4,
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── 사진 추가 버튼 ─────────────────────── */}
        {photos.length < 10 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFilePick}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              style={{
                width: '100%', padding: '11px',
                border: `2px dashed ${COLORS.border}`, borderRadius: 10,
                background: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 13, color: COLORS.textSecondary,
                marginBottom: 16, transition: 'border-color 0.12s',
              }}
            >
              📷 사진 추가{photos.length > 0 ? ` (${photos.length}/10)` : ''}
            </button>
          </>
        )}

        {/* ── 에러 ──────────────────────────────── */}
        {error && (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: COLORS.dangerTonal, color: COLORS.danger,
            fontSize: 13, marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {/* ── 게시하기 버튼 ──────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          style={{
            width: '100%', padding: '13px',
            background: !isValid || submitting ? COLORS.textHint : COLORS.primary,
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? '업로드 중...' : '게시하기'}
        </button>
      </div>
    </div>
  );
}
