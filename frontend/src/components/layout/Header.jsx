import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { showToast } from '../common/Toast';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
      showToast('로그인 되었습니다!', 'success');
    } catch (error) {
      showToast('로그인 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast('로그아웃 되었습니다.', 'info');
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <a href="/" className="header-logo">
            📸 PhotoShare
          </a>

          <nav className="header-nav">
            <a href="/" className="nav-link">
              홈
            </a>
            {isAuthenticated && (
              <>
                <a href="/explore" className="nav-link">
                  탐색
                </a>
                <a href="/profile" className="nav-link">
                  프로필
                </a>
              </>
            )}
          </nav>

          <div className="header-auth">
            {isAuthenticated ? (
              <div className="auth-user">
                <img
                  src={user?.profileImage}
                  alt={user?.name}
                  className="user-avatar"
                  title={user?.name}
                />
                <span className="user-name">{user?.name}</span>
                <Button variant="danger" size="sm" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowLoginModal(true)}
              >
                로그인
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 로그인 모달 */}
      <Modal
        isOpen={showLoginModal}
        title="로그인"
        onClose={() => setShowLoginModal(false)}
        size="sm"
      >
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <p className="login-hint">
            테스트: test@example.com / password123
          </p>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          >
            로그인
          </Button>
        </form>
      </Modal>
    </>
  );
};

export default Header;
