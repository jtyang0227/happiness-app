import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import apiClient from '../../api/apiClient';
import { inquiryApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/photos').catch(() => ({ data: [] })),
      apiClient.get('/auth/members').catch(() => ({ data: [] })),
      user?.id
        ? inquiryApi.getUnreadCount(user.id).catch(() => ({ count: 0 }))
        : Promise.resolve({ count: 0 }),
    ]).then(([photosRes, membersRes, inquiryRes]) => {
      const photos  = photosRes?.data;
      const members = membersRes?.data;
      setStats({
        photos:   Array.isArray(photos)  ? photos.length  : (photos?.totalElements ?? '—'),
        members:  Array.isArray(members) ? members.length : (members?.totalElements ?? '—'),
        inquiries: typeof inquiryRes === 'number' ? inquiryRes : (inquiryRes?.count ?? 0),
      });
    }).finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <AdminLayout currentPageTitle="대시보드">
      <style>{`@keyframes dash-shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>📊 대시보드</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>Happiness 플랫폼 운영 현황</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard icon="📷" label="전체 사진" value={stats?.photos} loading={loading} color="#5b6ef5" />
          <StatCard icon="👥" label="전체 회원" value={stats?.members} loading={loading} color="#a78bfa" />
          <StatCard icon="✉" label="미읽음 문의" value={stats?.inquiries} loading={loading} color="#e53e3e" />
        </div>

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
