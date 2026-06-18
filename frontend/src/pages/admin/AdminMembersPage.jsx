import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import apiClient from '../../api/apiClient';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    apiClient.get('/auth/members')
      .then(res => setMembers(res?.data ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = members.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (member) => {
    const nextRole = member.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`${member.name}의 권한을 ${nextRole}로 변경하시겠습니까?`)) return;
    try {
      await apiClient.put(`/auth/member/${member.id}/role`, { role: nextRole });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: nextRole } : m));
    } catch {
      alert('권한 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`⚠️ "${member.name}" 회원을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await apiClient.delete(`/auth/member/${member.id}`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setConfirmDelete(null);
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <AdminLayout currentPageTitle="회원 관리">
      <div style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>👥 회원 관리</h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>총 {members.length}명</p>
        </div>

        {/* 검색 */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색..."
            style={{
              width: '100%', maxWidth: 360, padding: '9px 14px', borderRadius: 10,
              border: '1.5px solid #e5e5ed', fontSize: 13, color: '#1a1a2e', outline: 'none',
            }}
          />
        </div>

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9090b0' }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9090b0' }}>결과 없음</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5ed', background: '#f7f7fb' }}>
                  {['ID', '이름', '이메일', '권한', '가입일', '관리'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9090b0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f8' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9090b0' }}>{m.id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden',
                        }}>
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : m.name?.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#5c5c7a' }}>{m.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: m.role === 'ADMIN' ? '#eef0ff' : '#f7f7fb',
                        color: m.role === 'ADMIN' ? '#5b6ef5' : '#9090b0',
                        border: `1px solid ${m.role === 'ADMIN' ? 'rgba(91,110,245,0.2)' : '#e5e5ed'}`,
                      }}>{m.role || 'USER'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9090b0' }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleRoleChange(m)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: '1.5px solid #e5e5ed', background: '#fff',
                            color: '#5c5c7a', cursor: 'pointer',
                          }}
                        >
                          {m.role === 'ADMIN' ? '→ USER' : '→ ADMIN'}
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: '1.5px solid #fecaca', background: '#fff5f5',
                            color: '#e53e3e', cursor: 'pointer',
                          }}
                        >삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
