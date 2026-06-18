import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { photoApi } from '../../services/api';

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    photoApi.getAll({ sortBy: 'createdAt', order: 'desc' })
      .then(res => setPhotos(res?.data ?? (Array.isArray(res) ? res : [])))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = photos.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.memberName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (photo) => {
    if (!window.confirm(`⚠️ "${photo.title || '제목 없음'}" 사진을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(photo.id);
    try {
      await photoApi.remove(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout currentPageTitle="사진 관리">
      <div style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>📷 사진 관리</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>총 {photos.length}장</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목 또는 작가명 검색..."
            style={{
              width: '100%', maxWidth: 360, padding: '9px 14px', borderRadius: 10,
              border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e', outline: 'none',
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9090b0' }}>불러오는 중...</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#9090b0' }}>결과 없음</div>
            ) : (
              <div>
                {filtered.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f8' : 'none',
                  }}>
                    <img
                      src={p.thumbnailUrl || p.imageUrl}
                      alt={p.title}
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#f0f0f0' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>
                        {p.title || '제목 없음'}
                      </div>
                      <div style={{ fontSize: 11, color: '#9090b0' }}>
                        {p.memberName || '—'} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR') : ''}
                        {p.colorMood && ` · ${p.colorMood}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: '#9090b0' }}>♡ {p.likesCount ?? 0}</span>
                      <a
                        href={`/photo/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: '1.5px solid #e5e5ed', background: '#fff',
                          color: '#5c5c7a', cursor: 'pointer', textDecoration: 'none',
                        }}
                      >보기</a>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: '1.5px solid #fecaca', background: deleting === p.id ? '#f0f0f0' : '#fff5f5',
                          color: '#e53e3e', cursor: deleting === p.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {deleting === p.id ? '...' : '삭제'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
