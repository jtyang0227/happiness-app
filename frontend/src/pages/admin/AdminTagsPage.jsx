import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { photoApi } from '../../services/api';

// ─── 목 데이터 (백엔드 태그 전용 API 구현 전까지 사용) ───────────────────────
// TODO: 백엔드에 GET /api/admin/tags, DELETE /api/admin/tags/:name,
//       POST /api/admin/tags/merge 엔드포인트 구현 후 아래 mock을 실제 API로 교체
const MOCK_TAGS = [
  { name: '인물사진', photoCount: 142, lastUsed: '2026-06-22' },
  { name: '풍경', photoCount: 98, lastUsed: '2026-06-21' },
  { name: '스트리트', photoCount: 76, lastUsed: '2026-06-20' },
  { name: '건축', photoCount: 55, lastUsed: '2026-06-19' },
  { name: '자연', photoCount: 44, lastUsed: '2026-06-18' },
  { name: '웨딩', photoCount: 38, lastUsed: '2026-06-17' },
  { name: '제품', photoCount: 31, lastUsed: '2026-06-15' },
  { name: '음식', photoCount: 27, lastUsed: '2026-06-14' },
  { name: '여행', photoCount: 22, lastUsed: '2026-06-10' },
  { name: '흑백', photoCount: 18, lastUsed: '2026-06-09' },
  { name: '매크로', photoCount: 12, lastUsed: '2026-06-05' },
  { name: '수중', photoCount: 5, lastUsed: '2026-05-28' },
  { name: '드론', photoCount: 3, lastUsed: '2026-05-20' },
  { name: '미사용태그', photoCount: 0, lastUsed: null },
  { name: '테스트', photoCount: 0, lastUsed: null },
];

// ─── 확인 다이얼로그 ─────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,10,24,0.55)', backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#5c5c7a', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a', cursor: 'pointer',
            }}
          >취소</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${danger ? '#fecaca' : 'rgba(91,110,245,0.3)'}`,
              background: danger ? '#e53e3e' : '#5b6ef5',
              color: '#fff', cursor: 'pointer',
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 병합 모달 ───────────────────────────────────────────────────────────────
function MergeModal({ tags, onMerge, onClose }) {
  const [sourceTag, setSourceTag] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [confirm, setConfirm] = useState(false);

  const canMerge = sourceTag && targetTag && sourceTag !== targetTag;

  const handleMerge = () => {
    if (!canMerge) return;
    setConfirm(true);
  };

  const handleConfirmed = () => {
    onMerge(sourceTag, targetTag);
    setConfirm(false);
  };

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(10,10,24,0.55)', backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>🔀 태그 병합</div>
          <div style={{ fontSize: 12, color: '#9090b0', marginBottom: 20 }}>
            태그 B의 모든 사진을 태그 A로 이동하고 태그 B를 삭제합니다.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9090b0', marginBottom: 6 }}>태그 B (삭제됨)</div>
              <select
                value={sourceTag}
                onChange={e => setSourceTag(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e',
                  outline: 'none', cursor: 'pointer', background: '#fff',
                }}
              >
                <option value="">선택...</option>
                {tags.filter(t => t.name !== targetTag).map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.photoCount}장)</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 20, color: '#9090b0', userSelect: 'none', marginTop: 20 }}>→</div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9090b0', marginBottom: 6 }}>태그 A (유지됨)</div>
              <select
                value={targetTag}
                onChange={e => setTargetTag(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e',
                  outline: 'none', cursor: 'pointer', background: '#fff',
                }}
              >
                <option value="">선택...</option>
                {tags.filter(t => t.name !== sourceTag).map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.photoCount}장)</option>
                ))}
              </select>
            </div>
          </div>

          {canMerge && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#eef0ff',
              fontSize: 12, color: '#5b6ef5', marginBottom: 16,
            }}>
              <strong>"{sourceTag}"</strong> 태그의 사진을 <strong>"{targetTag}"</strong> 태그로 이동합니다.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a', cursor: 'pointer',
              }}
            >취소</button>
            <button
              onClick={handleMerge}
              disabled={!canMerge}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none',
                background: canMerge ? '#5b6ef5' : '#e5e5ed',
                color: canMerge ? '#fff' : '#9090b0',
                cursor: canMerge ? 'pointer' : 'not-allowed',
              }}
            >병합하기</button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title="태그 병합 확인"
          message={`"${sourceTag}" 태그의 모든 사진이 "${targetTag}" 태그로 이동되고, "${sourceTag}" 태그는 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="병합 실행"
          danger={false}
          onConfirm={handleConfirmed}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function AdminTagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [sortBy, setSortBy] = useState('count'); // 'count' | 'name' | 'recent'

  useEffect(() => {
    // TODO: 실제 API — GET /api/admin/tags 로 교체
    // apiClient.get('/admin/tags').then(res => setTags(res.data)).catch(() => setTags([])).finally(() => setLoading(false));
    setTimeout(() => {
      setTags(MOCK_TAGS);
      setLoading(false);
    }, 400);
  }, []);

  const sorted = [...tags]
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'count') return b.photoCount - a.photoCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortBy === 'recent') {
        if (!a.lastUsed && !b.lastUsed) return 0;
        if (!a.lastUsed) return 1;
        if (!b.lastUsed) return -1;
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      }
      return 0;
    });

  const usedCount   = tags.filter(t => t.photoCount > 0).length;
  const unusedCount = tags.filter(t => t.photoCount === 0).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // TODO: 실제 API — DELETE /api/admin/tags/:name 로 교체
      // await apiClient.delete(`/admin/tags/${encodeURIComponent(deleteTarget.name)}`);
      await new Promise(r => setTimeout(r, 300)); // 모의 지연
      setTags(prev => prev.filter(t => t.name !== deleteTarget.name));
      setDeleteTarget(null);
    } catch {
      alert('태그 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleMerge = useCallback(async (sourceTag, targetTag) => {
    try {
      // TODO: 실제 API — POST /api/admin/tags/merge { source, target } 로 교체
      // await apiClient.post('/admin/tags/merge', { source: sourceTag, target: targetTag });
      await new Promise(r => setTimeout(r, 300)); // 모의 지연
      setTags(prev => {
        const srcCount = prev.find(t => t.name === sourceTag)?.photoCount ?? 0;
        return prev
          .filter(t => t.name !== sourceTag)
          .map(t => t.name === targetTag ? { ...t, photoCount: t.photoCount + srcCount } : t);
      });
    } catch {
      alert('태그 병합에 실패했습니다.');
    } finally {
      setShowMerge(false);
    }
  }, []);

  return (
    <AdminLayout currentPageTitle="태그 관리">
      <div style={{ maxWidth: 900 }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 16 }}>🏷️ 태그 관리</h1>

          {/* 통계 카드 */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: '전체 태그 수', value: tags.length, color: '#5b6ef5', bg: '#eef0ff' },
              { label: '사용된 태그', value: usedCount, color: '#059669', bg: '#ecfdf5' },
              { label: '미사용 태그', value: unusedCount, color: '#e53e3e', bg: '#fff5f5' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{
                padding: '14px 20px', borderRadius: 12,
                background: bg, border: `1px solid ${color}22`,
                minWidth: 140,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>{loading ? '—' : value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 툴바 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="태그명 검색..."
            style={{
              flex: '1 1 200px', maxWidth: 320, padding: '9px 14px', borderRadius: 10,
              border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e', outline: 'none',
            }}
          />

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e5ed',
              fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff', cursor: 'pointer',
            }}
          >
            <option value="count">사진 수 순</option>
            <option value="name">이름 순</option>
            <option value="recent">최근 사용 순</option>
          </select>

          <button
            onClick={() => setShowMerge(true)}
            disabled={tags.length < 2}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: '1.5px solid rgba(91,110,245,0.3)',
              background: tags.length >= 2 ? '#eef0ff' : '#f7f7fb',
              color: tags.length >= 2 ? '#5b6ef5' : '#9090b0',
              cursor: tags.length >= 2 ? 'pointer' : 'not-allowed',
            }}
          >🔀 태그 병합</button>
        </div>

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090b0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px',
                border: '3px solid #e5e5ed', borderTopColor: '#5b6ef5',
                animation: 'spin 0.8s linear infinite',
              }} />
              불러오는 중...
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090b0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏷️</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>태그가 없습니다</div>
              <div style={{ fontSize: 12 }}>검색 조건을 변경해보세요</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5ed', background: '#f7f7fb' }}>
                  {['#', '태그명', '사진 수', '최근 사용일', '액션'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: i === 2 ? 'right' : 'left',
                      fontSize: 11, fontWeight: 700, color: '#9090b0',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tag, i) => (
                  <TagRow
                    key={tag.name}
                    tag={tag}
                    index={i}
                    total={sorted.length}
                    onDelete={() => setDeleteTarget(tag)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <ConfirmDialog
          title="태그 삭제"
          message={
            deleteTarget.photoCount > 0
              ? `"${deleteTarget.name}" 태그는 ${deleteTarget.photoCount}장의 사진에 사용 중입니다. 삭제하면 해당 태그가 모든 사진에서 제거됩니다.`
              : `"${deleteTarget.name}" 태그를 삭제하시겠습니까?`
          }
          confirmLabel={deleting ? '삭제 중...' : '삭제'}
          danger
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}

      {/* 병합 모달 */}
      {showMerge && (
        <MergeModal
          tags={tags}
          onMerge={handleMerge}
          onClose={() => setShowMerge(false)}
        />
      )}
    </AdminLayout>
  );
}

// ─── 태그 행 컴포넌트 ─────────────────────────────────────────────────────────
function TagRow({ tag, index, total, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const isUnused = tag.photoCount === 0;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: index < total - 1 ? '1px solid #f0f0f8' : 'none',
        background: hovered ? '#f9f9fd' : '#fff',
        transition: 'background 0.1s',
      }}
    >
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#9090b0', width: 40 }}>
        {index + 1}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: isUnused ? '#f7f7fb' : '#f0f0ff',
          color: isUnused ? '#9090b0' : '#5b6ef5',
          border: `1px solid ${isUnused ? '#e5e5ed' : 'rgba(91,110,245,0.2)'}`,
        }}>
          #{tag.name}
        </span>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: isUnused ? '#9090b0' : '#1a1a2e',
        }}>
          {tag.photoCount.toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: '#9090b0', marginLeft: 2 }}>장</span>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: '#9090b0' }}>
        {tag.lastUsed
          ? new Date(tag.lastUsed).toLocaleDateString('ko-KR')
          : <span style={{ color: '#e53e3e', fontStyle: 'italic' }}>미사용</span>
        }
      </td>
      <td style={{ padding: '12px 16px' }}>
        <button
          onClick={onDelete}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: '1.5px solid #fecaca', background: '#fff5f5',
            color: '#e53e3e', cursor: 'pointer',
          }}
        >삭제</button>
      </td>
    </tr>
  );
}
