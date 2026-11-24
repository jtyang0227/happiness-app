import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import useAuthStore from '../store/authStore';
import { authApi } from '../services/api';

/**
 * Apple Sign In 결과 페이지.
 * Apple은 form_post로 백엔드로 redirect → 백엔드가 이 URL로 redirect하며
 * accessToken, refreshToken, memberId 쿼리 파라미터를 포함한다.
 */
export default function AppleResultPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const memberId = params.get('memberId');
    const err = params.get('error');

    if (err || !accessToken || !memberId) {
      setError('Apple 로그인에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    (async () => {
      try {
        const res = await authApi.getMember(memberId);
        const member = res.data ?? res;
        useAuthStore.getState().loginSuccess(accessToken, refreshToken, member);
        navigate('/', { replace: true });
      } catch {
        setError('Apple 로그인 처리 중 오류가 발생했습니다.');
      }
    })();
  }, [navigate]);

  if (error) return <CallbackError message={error} />;
  return <CallbackLoading label="Apple 로그인 처리 중..." />;
}

function CallbackLoading({ label }) {
  return (
    <div style={centerStyle}>
      <div style={spinnerStyle} />
      <div style={{ color: COLORS.darkTextSub, fontSize: 14 }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CallbackError({ message }) {
  const navigate = useNavigate();
  return (
    <div style={{ ...centerStyle, gap: 16 }}>
      <div style={{ color: '#ff9090', fontSize: 15 }}>{message}</div>
      <button onClick={() => navigate('/login')} style={backBtnStyle}>
        로그인으로 돌아가기
      </button>
    </div>
  );
}

const centerStyle = {
  minHeight: '100vh', background: COLORS.darkBg,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
};
const spinnerStyle = {
  width: 36, height: 36, borderRadius: '50%',
  border: '3px solid #1e1e3a', borderTopColor: COLORS.primary,
  animation: 'spin 0.8s linear infinite',
};
const backBtnStyle = {
  padding: '10px 24px', borderRadius: 10, border: 'none',
  background: COLORS.primary, color: '#fff', fontWeight: 700, cursor: 'pointer',
};
