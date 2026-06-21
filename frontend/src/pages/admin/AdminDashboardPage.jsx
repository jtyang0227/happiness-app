import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import apiClient from '../../api/apiClient';
import { inquiryApi, photoApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { GENRE_META } from '../../constants/colors';

function StatCard({ icon, label, value, color = '#5b6ef5', loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 24px',
      border: '1px solid #e5e5ed', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, fontSize: 22,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: '#9090b0', fontWeight: 500, marginBottom: 4 }}>{label}</div>
        {loading ? (
          <div style={{ width: 60, height: 20, borderRadius: 6, background: '#ededf4', animation: 'dash-shimmer 1.4s infinite' }} />
        ) : (
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e' }}>{value?.toLocaleString() ?? 0}</div>
        )}
      </div>
    </div>
  );
}

function GenreDonutChart({ data, total }) {
  const canvasRef = useRef(null);
  const COLORS_LIST = Object.values(GENRE_META).map(g => g.color);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2, cy = size / 2;
    const outerR = size * 0.42, innerR = size * 0.24;

    ctx.clearRect(0, 0, size, size);
    let startAngle = -Math.PI / 2;
    data.forEach((item, i) => {
      const slice = (item.count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.closePath();
      const meta = GENRE_META[item.genre];
      ctx.fillStyle = meta?.color ?? COLORS_LIST[i % COLORS_LIST.length];
      ctx.fill();
      startAngle += slice;
    });

    // donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // center text
    ctx.fillStyle = '#1a1a2e';
    ctx.font = `bold ${Math.round(size * 0.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toLocaleString(), cx, cy - 6);
    ctx.font = `${Math.round(size * 0.065)}px sans-serif`;
    ctx.fillStyle = '#9090b0';
    ctx.fillText('총 사진', cx, cy + size * 0.1);
  }, [data, total]); // eslint-disable-line

  return <canvas ref={canvasRef} width={160} height={160} />;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [genreStats, setGenreStats] = useState([]);
  const [uncategorized, setUncategorized] = useState(0);

  useEffect(() => {
    Promise.all([
      apiClient.get('/photos').catch(() => ({ data: [] })),
      apiClient.get('/auth/members').catch(() => ({ data: [] })),
      user?.id
        ? inquiryApi.getUnreadCount(user.id).catch(() => ({ count: 0 }))
        : Promise.resolve({ count: 0 }),
      photoApi.getGenreStats().catch(() => ({ data: [] })),
    ]).then(([photosRes, membersRes, inquiryRes, genreRes]) => {
      const photos  = photosRes?.data;
      const members = membersRes?.data;
      const photoCount = Array.isArray(photos) ? photos.length : (photos?.data?.length ?? 0);

      const gStats = Array.isArray(genreRes?.data) ? genreRes.data : [];
      const categorized = gStats.reduce((s, g) => s + Number(g.count), 0);
      setGenreStats(gStats);
      setUncategorized(Math.max(0, photoCount - categorized));

      setStats({
        photos:    photoCount,
        members:   Array.isArray(members) ? members.length : (members?.totalElements ?? '—'),
        inquiries: typeof inquiryRes === 'number' ? inquiryRes : (inquiryRes?.count ?? 0),
        categorized,
      });
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const genreTotal = genreStats.reduce((s, g) => s + Number(g.count), 0);

  return (
    <AdminLayout currentPageTitle="대시보드">
      <style>{`@keyframes dash-shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>📊 대시보드</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>Happiness 플랫폼 운영 현황</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard icon="📷" label="전체 사진"      value={stats?.photos}      loading={loading} color="#5b6ef5" />
          <StatCard icon="👥" label="전체 회원"      value={stats?.members}     loading={loading} color="#a78bfa" />
          <StatCard icon="✉"  label="미읽음 문의"    value={stats?.inquiries}   loading={loading} color="#e53e3e" />
          <StatCard icon="🏷️" label="장르 분류 완료" value={stats?.categorized} loading={loading} color="#43a047" />
        </div>

        {/* 미분류 경고 */}
        {!loading && uncategorized > 0 && (
          <div style={{
            background: '#fff8e1', border: '1px solid #ffb300', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#f57c00', fontSize: 13 }}>미분류 사진 {uncategorized}장</div>
              <div style={{ fontSize: 12, color: '#9090b0' }}>장르가 지정되지 않은 사진이 있습니다. <a href="/admin/photos" style={{ color: '#5b6ef5' }}>사진 관리</a>에서 분류하세요.</div>
            </div>
          </div>
        )}

        {/* 장르 통계 */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          border: '1px solid #e5e5ed', marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>🎨 장르별 사진 분포</div>
          {loading ? (
            <div style={{ color: '#9090b0', fontSize: 13 }}>로딩 중...</div>
          ) : genreStats.length === 0 ? (
            <div style={{ color: '#9090b0', fontSize: 13 }}>장르가 분류된 사진이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <GenreDonutChart data={genreStats} total={genreTotal} />
              <div style={{ flex: 1, minWidth: 200 }}>
                {genreStats.slice(0, 8).map(item => {
                  const meta = GENRE_META[item.genre];
                  const pct = genreTotal ? Math.round((item.count / genreTotal) * 100) : 0;
                  return (
                    <div key={item.genre} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{meta?.emoji ?? '📷'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{meta?.label ?? item.genre}</span>
                          <span style={{ fontSize: 12, color: '#9090b0' }}>{item.count}장 ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: '#f0f0f0' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: meta?.color ?? '#5b6ef5', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 빠른 접근 */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          border: '1px solid #e5e5ed',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>빠른 접근</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '갤러리 순서 관리', path: '/admin/gallery-order', icon: '🖼️' },
              { label: '회원 관리',        path: '/admin/members',       icon: '👥' },
              { label: '사진 관리',        path: '/admin/photos',        icon: '📷' },
              { label: '카테고리 관리',    path: '/admin/categories',    icon: '🏷️' },
            ].map(item => (
              <a key={item.path} href={item.path} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, textDecoration: 'none',
                background: '#f7f7fb', border: '1px solid #e5e5ed',
                fontSize: 13, fontWeight: 600, color: '#5c5c7a',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#eef0ff'; e.currentTarget.style.color = '#5b6ef5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f7f7fb'; e.currentTarget.style.color = '#5c5c7a'; }}
              >
                {item.icon} {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
