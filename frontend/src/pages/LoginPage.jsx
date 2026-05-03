import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/common/Toast';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('우주에 오신 것을 환영합니다!', 'success');
      navigate('/');
    } catch {
      showToast('로그인에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Ambient nebula orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* Star field */}
      <div className="login-stars" />

      <div className="login-wrapper">
        {/* Logo */}
        <div className="login-logo" onClick={() => navigate('/')}>
          <span className="login-logo-icon">✦</span>
          <span className="login-logo-text">Cosmos</span>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h1 className="login-title">다시 만나서 반가워요</h1>
            <p className="login-subtitle">계정에 로그인하고 우주를 탐험하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email" className="login-label">이메일</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  className="login-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">비밀번호</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">⬡</span>
                <input
                  id="password"
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`login-btn-primary${loading ? ' loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>또는</span>
          </div>

          {/* Kakao login */}
          <button className="login-btn-kakao" type="button">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M9 1C4.582 1 1 3.91 1 7.5c0 2.27 1.413 4.27 3.565 5.46L3.7 16.06a.25.25 0 0 0 .369.277L8.24 13.96c.252.02.505.04.76.04 4.418 0 8-2.91 8-6.5S13.418 1 9 1z"
                fill="#3C1E1E"
              />
            </svg>
            카카오로 로그인
          </button>

          {/* Test hint */}
          <div className="login-hint">
            <span className="login-hint-label">테스트 계정</span>
            <code>test@example.com / password123</code>
          </div>
        </div>

        <p className="login-back">
          <button className="login-back-btn" onClick={() => navigate('/')}>
            ← 갤러리로 돌아가기
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
