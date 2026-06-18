import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import apiClient from '../../api/apiClient';
import { photoApi } from '../../services/api';

export default function AdminGalleryOrderPage() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const dragIdxRef = useRef(null);

  // 회원 목록
  useEffect(() => {
    apiClient.get('/auth/members')
      .then(res => setMembers(res?.data ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  // 멤버 선택 시 사진 로드
  const loadPhotos = useCallback(async (memberId) => {
    if (!memberId) { setPhotos([]); return; }
    setLoadingPhotos(true);
    setDirty(false);
    try {
      const res = await photoApi.getByMember(memberId, { sortBy: 'displayOrder', order: 'asc' });
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      const sorted = [...list].sort((a, b) => {
        if (a.displayOrder != null && b.displayOrder != null) return a.displayOrder - b.displayOrder;
        if (a.displayOrder != null) return -1;
        if (b.displayOrder != null) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPhotos(sorted);
    } catch {
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const handleMemberChange = (e) => {
    setSelectedMemberId(e.target.value);
    loadPhotos(e.target.value);
  };

  /* ── 드래그 & 드롭 ── */
  const handleDragStart = (e, idx) => {
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    dragIdxRef.current = null;
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    const from = dragIdxRef.current;
    if (from === null || from === idx) return;
    setPhotos(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const orders = photos.map((p, i) => ({ id: p.id, displayOrder: i }));
      await photoApi.reorder(orders);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedMember = members.find(m => String(m.id) === String(selectedMemberId));

  return (
    <AdminLayout currentPageTitle="갤러리 표시 순서 관리">
      <div style={{ maxWidth: 1100 }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>🖼️ 갤러리 표시 순서 관리</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>드래그로 순서를 변경한 뒤 저장 버튼을 누르세요.</p>
        </div>

        {/* 멤버 선택 + 저장 */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          border: '1px solid #e5e5ed', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <select
            value={selectedMemberId}
            onChange={handleMemberChange}
            disabled={loadingMembers}
            style={{
              flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
              border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e',
              background: '#fff', cursor: 'pointer',
            }}
          >
            <option value="">멤버를 선택하세요</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
            ))}
          </select>

          {selectedMember && (
            <span style={{ fontSize: 12, color: '#9090b0' }}>사진 {photos.length}장</span>
          )}

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {dirty && (
              <button
                onClick={() => loadPhotos(selectedMemberId)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a', cursor: 'pointer',
                }}
              >되돌리기</button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none',
                background: saved ? '#22c55e' : !dirty ? '#c5c9f5' : '#5b6ef5',
                color: '#fff', cursor: (!dirty || saving) ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s',
              }}
            >
              {saved ? '✓ 저장됨' : saving ? '저장 중...' : '순서 저장'}
            </button>
          </div>
        </div>

        {/* Dirty 배너 */}
        {dirty && (
          <div style={{
            background: '#eef0ff', border: '1px solid rgba(91,110,245,0.25)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            fontSize: 13, color: '#5b6ef5', fontWeight: 600,
          }}>
            ⚠️ 저장하지 않은 변경사항이 있습니다
          </div>
        )}

        {/* 사진 그리드 */}
        {loadingPhotos ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9090b0' }}>불러오는 중...</div>
        ) : !selectedMemberId ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            border: '2px dashed #e5e5ed', borderRadius: 16, color: '#9090b0', fontSize: 14,
          }}>
            위에서 멤버를 선택하면 사진이 표시됩니다.
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            border: '2px dashed #e5e5ed', borderRadius: 16, color: '#9090b0', fontSize: 14,
          }}>
            등록된 사진이 없습니다.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, idx)}
                onDragEnter={e => { e.currentTarget.style.borderColor = '#5b6ef5'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(91,110,245,0.25)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#e5e5ed'; e.currentTarget.style.boxShadow = 'none'; }}
                style={{
                  borderRadius: 10, overflow: 'hidden', cursor: 'grab',
                  border: '2px solid #e5e5ed', background: '#fff',
                  userSelect: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#f0f0f0' }}>
                    <img
                      src={photo.thumbnailUrl || photo.imageUrl}
                      alt={photo.title}
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                    />
                  </div>
                  {/* 순서 배지 */}
                  <div style={{
                    position: 'absolute', top: 5, left: 5,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#5b6ef5', color: '#fff',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{idx + 1}</div>
                  {/* 핸들 아이콘 */}
                  <div style={{
                    position: 'absolute', top: 5, right: 5,
                    color: 'rgba(255,255,255,0.9)', fontSize: 14,
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  }}>⠿</div>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: '#1a1a2e', margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{photo.title || '제목 없음'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
