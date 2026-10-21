import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import apiClient from '../../api/apiClient';
import { seriesApi } from '../../services/api';
import { COLORS } from '../../constants/colors';
import { shootTypeLabel } from '../../constants/shootTypes';
import Button from '../../components/common/Button';

/**
 * 작업 큐레이션 (/admin/curation, WORK_QUEUE 8) — 공개 작업을 "에디터 추천"으로 올리고 내린다.
 * 탐색 작업 탭 상단 "✦ 에디터 추천" 띠에 노출된다. 올리기·내리기 모두 이중 확인, 내리기는 위험 색(danger).
 * 목록은 공개 탐색 API를 그대로 쓴다(초안·비공개 작가·사진 없는 작업은 처음부터 후보가 아님).
 */
const PAGE_SIZE = 24;
const TABS = [
  { key: 'all', label: '전체 작업' },
  { key: 'featured', label: '추천 중' },
];

export default function AdminCurationPage() {
  const [tab, setTab] = useState('all');
  const [works, setWorks] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const params = useCallback((p) => (tab === 'featured'
    ? { featured: true, page: p, size: PAGE_SIZE }
    : { sort: 'recent', page: p, size: PAGE_SIZE }), [tab]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setConfirmId(null);
    seriesApi.discover(params(0))
      .then(res => { if (alive) { setWorks(res?.data ?? []); setPage(0); setHasNext(Boolean(res?.hasNext)); } })
      .catch(() => { if (alive) setError('작업 목록을 불러오지 못했습니다.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await seriesApi.discover(params(next));
      setWorks(prev => {
        const seen = new Set(prev.map(w => w.id));
        return [...prev, ...(res?.data ?? []).filter(w => !seen.has(w.id))];
      });
      setPage(next);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      setError('더 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFeatured = async (work) => {
    const next = !work.featured;
    setBusyId(work.id);
    setError('');
    try {
      await apiClient.put(`/admin/series/${work.id}/featured`, { featured: next });
      setWorks(ws => tab === 'featured' && !next
        ? ws.filter(w => w.id !== work.id)
        : ws.map(w => (w.id === work.id ? { ...w, featured: next } : w)));
      setConfirmId(null);
    } catch (err) {
      setError(err?.response?.data?.message || '변경하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout currentPageTitle="작업 큐레이션">
      <div style={{ maxWidth: 960 }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
          추천한 작업은 아카이브 → 작업 탭 맨 위 "✦ 에디터 추천"에 최근 추천한 순으로 보여요.
          초안·비공개 작가·사진 없는 작업은 후보에 나오지 않아요.
        </p>
        <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                fontWeight: tab === t.key ? 700 : 500,
                border: `1px solid ${tab === t.key ? COLORS.text : COLORS.border}`,
                background: tab === t.key ? COLORS.text : COLORS.surface,
                color: tab === t.key ? COLORS.surface : COLORS.textSecondary,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
          </div>
        ) : works.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: COLORS.textMuted, fontSize: 14 }}>
            {tab === 'featured' ? '추천 중인 작업이 없어요.' : '공개된 작업이 없어요.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {works.map(w => {
              const meta = [shootTypeLabel(w.shootType), w.memberName || w.memberProfileName, w.memberLocation].filter(Boolean).join(' · ');
              const confirming = confirmId === w.id;
              return (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12,
                  background: COLORS.surface, border: `1px solid ${w.featured ? COLORS.primary : COLORS.border}`,
                }}>
                  <div style={{ width: 72, height: 54, borderRadius: 8, overflow: 'hidden', background: COLORS.surfaceDim, flexShrink: 0 }}>
                    {w.coverImageUrl && <img src={w.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={`/portfolio/${w.memberProfileName}/work/${w.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, textDecoration: 'none' }}>
                      {w.featured && <span style={{ color: COLORS.primary, marginRight: 6 }}>✦</span>}{w.title} ↗
                    </a>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta} · 👏 {w.appreciationCount} · 👁 {w.viewCount} · {w.photoCount}장
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {confirming ? (
                      <>
                        <Button size="sm" variant={w.featured ? 'danger' : 'primary'} loading={busyId === w.id} onClick={() => applyFeatured(w)}>
                          {w.featured ? '정말 내리기' : '정말 올리기'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>취소</Button>
                      </>
                    ) : (
                      <Button size="sm" variant={w.featured ? 'secondary' : 'primary'} onClick={() => setConfirmId(w.id)}>
                        {w.featured ? '추천 내리기' : '추천에 올리기'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && hasNext && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Button variant="secondary" loading={loadingMore} onClick={loadMore}>{loadingMore ? '불러오는 중' : '더 보기'}</Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
