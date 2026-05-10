import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <h2>접근 권한이 없습니다</h2>
      <p style={{ color: '#888', marginBottom: 24 }}>이 페이지는 허가된 사용자만 접근할 수 있습니다.</p>
      <button onClick={() => navigate(-1)}
        style={{ padding: '10px 24px', borderRadius: 8, background: '#5c5cff', color: '#fff', border: 'none', cursor: 'pointer' }}>
        이전 페이지로
      </button>
    </div>
  );
}
