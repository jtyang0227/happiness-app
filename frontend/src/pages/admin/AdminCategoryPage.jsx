import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { photoApi } from '../../services/api';
import { GENRE_META, GENRE_LIST } from '../../constants/colors';

export default function AdminCategoryPage() {
  const [genreStats, setGenreStats] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [uncategorized, setUncategorized] = useState(0);

  useEffect(() => {
    Promise.all([
      photoApi.getGenreStats(),
      photoApi.getAll({ sortBy: 'createdAt', order: 'desc' }),
    ]).then(([statsRes, allRes]) => {
      const stats = Array.isArray(statsRes?.data) ? statsRes.data : [];
      const photos = allRes?.data ?? [];
      const photoCount = Array.isArray(photos) ? photos.length : 0;
      const categorized = stats.reduce((s, g) => s + Number(g.count), 0);
      setGenreStats(stats);
      setTotal(photoCount);
      setUncategorized(Math.max(0, photoCount - categorized));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sortedStats = [...genreStats].sort((a, b) => Number(b.count) - Number(a.count));
  const genreTotal = sortedStats.reduce((s, g) => s + Number(g.count), 0);

  // Merge genre list with stats so all 12 genres show
  const fullList = GENRE_LIST.map(g => {
    const found = sortedStats.find(s => s.genre === g.code);
    return { ...g, count: found ? Number(found.count) : 0 };
  }).sort((a, b) => b.count - a.count);

  return (
    <AdminLayout currentPageTitle="카테고리 관리">
      <div style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>🏷️ 카테고리 관리</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>장르별 사진 분류 현황 및 통계</p>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: '전체 사진',      value: total,          icon: '📷', color: '#5b6ef5' },
            { label: '분류 완료',      value: genreTotal,     icon: '✅', color: '#43a047' },
            { label: '미분류',        value: uncategorized,  icon: '⚠️', color: '#f59e0b' },
            { label: '사용 장르 수',  value: sortedStats.filter(s => s.count > 0).length, icon: '🎨', color: '#a78bfa' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 12, padding: '16px 18px',
              border: '1px solid #e5e5ed', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color, marginBottom: 2 }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{ fontSize: 12, color: '#9090b0' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* 미분류 경고 */}
        {!loading && uncategorized > 0 && (
          <div style={{
            background: '#fff8e1', border: '1px solid #ffb300', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#f57c00', fontSize: 13 }}>
                미분류 사진 {uncategorized}장이 있습니다
              </div>
              <div style={{ fontSize: 12, color: '#9090b0', marginTop: 2 }}>
                <a href="/admin/photos" style={{ color: '#5b6ef5', fontWeight: 600 }}>사진 관리</a>
                {' '}에서 개별 장르를 지정하거나, 사진 등록 시 장르를 선택하세요.
              </div>
            </div>
          </div>
        )}

        {/* 장르 통계 테이블 */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f8' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>장르별 현황</div>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9090b0' }}>로딩 중...</div>
          ) : (
            <div>
              {fullList.map((g, i) => {
                const pct = genreTotal > 0 ? Math.round((g.count / genreTotal) * 100) : 0;
                return (
                  <div key={g.code} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: i < fullList.length - 1 ? '1px solid #f0f0f8' : 'none',
                  }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 10, background: g.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>{g.emoji}</span>
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{g.label}</div>
                      <div style={{ fontSize: 10, color: '#9090b0' }}>{g.code}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, borderRadius: 3, background: '#f0f0f0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, background: g.color,
                          width: `${pct}%`, transition: 'width 0.5s',
                          minWidth: g.count > 0 ? 4 : 0,
                        }} />
                      </div>
                    </div>
                    <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: g.count > 0 ? g.color : '#ccc' }}>
                        {g.count}
                      </span>
                      <span style={{ fontSize: 11, color: '#9090b0', marginLeft: 3 }}>
                        {pct > 0 ? `(${pct}%)` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div style={{
          marginTop: 20, padding: '14px 18px', borderRadius: 10,
          background: '#f7f7fb', border: '1px solid #e5e5ed', fontSize: 12, color: '#9090b0', lineHeight: 1.7,
        }}>
          <strong style={{ color: '#5c5c7a' }}>💡 안내</strong><br />
          • 사진 등록·수정 시 주 장르(1개)와 서브 장르(최대 2개)를 선택할 수 있습니다.<br />
          • 장르 통계는 미분류(장르 없음) 사진을 제외한 수치입니다.<br />
          • <a href="/admin/photos" style={{ color: '#5b6ef5' }}>사진 관리</a>에서 각 사진의 장르를 개별 수정할 수 있습니다.
        </div>
      </div>
    </AdminLayout>
  );
}
