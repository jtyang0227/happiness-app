import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

export default function PhotoSortPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const dragIdxRef = useRef(null);
  const dragOverIdxRef = useRef(null);

  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await photoApi.getByMember(user.id);
      const list = Array.isArray(res) ? res : res?.data ?? [];
      // displayOrder가 있으면 그 순서로, 없으면 createdAt 내림차순 유지
      const sorted = [...list].sort((a, b) => {
        if (a.displayOrder != null && b.displayOrder != null)
          return a.displayOrder - b.displayOrder;
        if (a.displayOrder != null) return -1;
        if (b.displayOrder != null) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPhotos(sorted);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  /* ── HTML5 Drag & Drop ─────────────────────────────────── */
  const handleDragStart = (e, idx) => {
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    dragIdxRef.current = null;
    dragOverIdxRef.current = null;
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIdxRef.current = idx;
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    const from = dragIdxRef.current;
    const to = idx;
    if (from === null || from === to) return;

    setPhotos(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  /* ── 저장 ─────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const orders = photos.map((p, i) => ({ id: p.id, displayOrder: i }));
      await photoApi.reorder(orders);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Dirty 배너 — sticky */}
      {dirty && (
        <div style={{
          position: 'sticky', top: 58, zIndex: 50,
          background: COLORS.primaryLight,
          borderBottom: '1px solid rgba(91,110,245,0.2)',
          padding: '10px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          margin: '0 -20px 16px',
        }}>
          <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>
            ⚠️ 저장하지 않은 변경사항이 있습니다
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: 'none', background: COLORS.primary, color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중...' : '지금 저장'}
            </button>
            <button
              onClick={fetchPhotos}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${COLORS.border}`, background: '#fff',
                color: COLORS.textSecondary, cursor: 'pointer',
              }}
            >
              되돌리기
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
            🗂️ 갤러리 순서 변경
          </h1>
          <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            드래그하여 사진 순서를 변경하세요
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: `1.5px solid ${COLORS.border}`, background: '#fff',
              color: COLORS.textSecondary, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              border: 'none',
              background: saved ? '#22c55e' : saving || !dirty ? '#a0a8e8' : COLORS.primary,
              color: '#fff', cursor: saving || !dirty ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
            }}
          >
            {saved ? '✓ 저장됨' : saving ? '저장 중...' : '순서 저장'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
          불러오는 중...
        </div>
      ) : photos.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          border: `2px dashed ${COLORS.border}`, borderRadius: 20,
        }}>
          <p style={{ color: COLORS.textSecondary }}>등록된 사진이 없습니다.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}>
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                borderRadius: 12, overflow: 'hidden', cursor: 'grab',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `2px solid ${COLORS.border}`,
                background: COLORS.surface, userSelect: 'none',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onDragEnter={e => {
                if (dragIdxRef.current !== idx) {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.boxShadow = `0 4px 20px rgba(91,110,245,0.2)`;
                }
              }}
              onDragLeave={e => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#f0f0f0' }}>
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                    draggable={false}
                  />
                </div>
                {/* 순서 배지 */}
                <div style={{
                  position: 'absolute', top: 6, left: 6,
                  width: 22, height: 22, borderRadius: '50%',
                  background: COLORS.primary, color: '#fff',
                  fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </div>
                {/* 드래그 핸들 */}
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  color: 'rgba(255,255,255,0.9)', fontSize: 16,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  lineHeight: 1, userSelect: 'none',
                }}>
                  ⠿
                </div>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: COLORS.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
                }}>
                  {photo.title || '제목 없음'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
