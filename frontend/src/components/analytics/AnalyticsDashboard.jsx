import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import { analyticsApi } from '../../services/analyticsApi';
import KpiCard from './KpiCard';
import LineChart from './LineChart';
import DonutChart from './DonutChart';
import TopPhotos from './TopPhotos';

const PERIODS = [
  { label: '7일',  value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
  { label: '1년',  value: 365 },
];

const GENRE_COLORS = [
  '#5b6ef5', '#a78bfa', '#34d399', '#f59e0b',
  '#ef4444', '#3b82f6', '#ec4899', '#10b981',
  '#f97316', '#8b5cf6', '#06b6d4', '#84cc16',
];

export default function AnalyticsDashboard({ memberId }) {
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topPhotos, setTopPhotos] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [topMetric, setTopMetric] = useState('likes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError('');

    Promise.all([
      analyticsApi.getSummary(memberId, period),
      analyticsApi.getDaily(memberId, period),
      analyticsApi.getTopPhotos(memberId, topMetric, 5),
      analyticsApi.getGenreDistribution(memberId),
    ])
      .then(([sum, dailyData, top, genre]) => {
        setSummary(sum);
        setDaily(Array.isArray(dailyData) ? dailyData : []);
        setTopPhotos(Array.isArray(top) ? top : []);
        setGenreData(
          (Array.isArray(genre) ? genre : []).map((g, i) => ({
            ...g,
            color: GENRE_COLORS[i % GENRE_COLORS.length],
          }))
        );
      })
      .catch(() => setError('분석 데이터를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [memberId, period]);

  // Reload top photos on metric change
  useEffect(() => {
    if (!memberId || loading) return;
    analyticsApi.getTopPhotos(memberId, topMetric, 5)
      .then(top => setTopPhotos(Array.isArray(top) ? top : []))
      .catch(() => {});
  }, [topMetric]);

  const kpis = [
    { label: '포트폴리오 방문', value: summary?.portfolioViews ?? 0, change: summary?.portfolioViewsChange },
    { label: '사진 조회',       value: summary?.photoViews    ?? 0, change: summary?.photoViewsChange },
    { label: '좋아요',          value: summary?.totalLikes    ?? 0, change: summary?.likesChange },
    { label: '저장',            value: summary?.totalSaves    ?? 0, change: summary?.savesChange },
  ];

  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        {/* Period tabs skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PERIODS.map(p => (
            <div key={p.value} style={{ width: 48, height: 32, borderRadius: 20, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        {/* KPI skeleton */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ flex: '1 1 140px', height: 90, borderRadius: 16, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        {/* Chart skeleton */}
        <div style={{ height: 180, borderRadius: 16, background: COLORS.surfaceDim, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, color: COLORS.textMuted }}>{error}</div>
      </div>
    );
  }

  const hasData = summary !== null || daily.length > 0;

  if (!hasData) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
          아직 분석 데이터가 없습니다.
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          포트폴리오 링크를 공유해보세요.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, paddingTop: 12 }}>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${period === p.value ? COLORS.primary : COLORS.border}`,
              background: period === p.value ? COLORS.primaryLight : COLORS.surface,
              color: period === p.value ? COLORS.primary : COLORS.textSecondary,
              fontSize: 12,
              fontWeight: period === p.value ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {kpis.map(kpi => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} change={kpi.change} period={period} />
        ))}
      </div>

      {/* Line chart */}
      {daily.length > 1 && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '16px 12px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12, paddingLeft: 4 }}>
            방문 추이
          </div>
          <LineChart data={daily} color={COLORS.primary} height={180} />
        </div>
      )}

      {/* Top photos + Genre side by side */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16 }}>
          <TopPhotos photos={topPhotos} metric={topMetric} onChangeMetric={setTopMetric} />
        </div>
        {genreData.length > 0 && (
          <div style={{ flex: '1 1 200px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>장르 분포</div>
            <DonutChart data={genreData} size={140} />
          </div>
        )}
      </div>
    </div>
  );
}
