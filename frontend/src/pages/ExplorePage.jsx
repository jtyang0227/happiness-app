import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import WorkDiscovery from '../components/discover/WorkDiscovery';
import PhotoBrowser from '../components/explore/PhotoBrowser';

/**
 * 탐색 (/explore, 공개) — 사진 | 작업.
 * 사진 탭은 예전 갤러리(/)·목록(/list)·탐색 사진을 합친 PhotoBrowser(PLANNING_nav-consolidation.md 2.1),
 * 작업 탭은 작가를 가로질러 작업 노트를 둘러본다(PLANNING_work-discovery.md). ?tab=works로 공유 가능.
 */
const TABS = [
  { key: 'photos', label: '사진' },
  { key: 'works',  label: '작업' },
];

function TabSegment({ value, onChange }) {
  return (
    <div role="tablist" aria-label="아카이브 보기 대상" style={{
      display: 'inline-flex', padding: 4, borderRadius: 12, background: COLORS.bg,
    }}>
      {TABS.map(t => {
        const active = value === t.key;
        return (
          <button key={t.key} type="button" role="tab" aria-selected={active}
            className="explore-tab" onClick={() => onChange(t.key)}
            style={{
              minWidth: 84, height: 36, padding: '0 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: active ? 700 : 500,
              background: active ? COLORS.surface : 'transparent',
              color: active ? COLORS.text : COLORS.textMuted,
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'works' ? 'works' : 'photos';

  const handleTabChange = useCallback((next) => {
    const newParams = new URLSearchParams(searchParams);
    if (next === 'works') newParams.set('tab', 'works'); else newParams.delete('tab');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <style>{`
        .explore-tab { transition: background 0.15s ease, color 0.15s ease; }
        .explore-tab:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 12px' }}>
        <TabSegment value={tab} onChange={handleTabChange} />
      </div>
      {tab === 'works' ? (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 20px 28px' }}>
          <WorkDiscovery />
        </div>
      ) : (
        <PhotoBrowser />
      )}
    </div>
  );
}
