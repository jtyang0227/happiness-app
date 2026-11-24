import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { COLORS } from '../constants/colors';
import useAuthStore from '../store/authStore';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError('인증 코드를 받지 못했습니다.');
      return;
    }

    (async () => {
      try {
        const res = await authApi.googleLogin(code);
        const { accessToken, refreshToken, member } = res.data ?? res;
        useAuthStore.getState().loginSuccess(accessToken, refreshToken, member);
        navigate('/', { replace: true });
      } catch {
        setError('Google 로그인에 실패했습니다. 다시 시도해주세요.');
      }
    })();
  }, [navigate]);

  if (error) return <CallbackError message={error} />;
  return <CallbackLoading label="Google 로그인 처리 중..." />;
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
