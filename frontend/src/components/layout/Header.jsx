import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import { showToast } from '../common/Toast';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    showToast('로그아웃 되었습니다.', 'info');
  };

  return (
    <header className="header">
      <div className="header-container">
        <a href="/" className="header-logo">
          <span className="logo-icon">✦</span>
          Cosmos
        </a>

        <nav className="header-nav">
          <a href="/" className="nav-link">홈</a>
          {isAuthenticated && (
            <>
              <a href="/explore" className="nav-link">탐색</a>
              <a href="/profile" className="nav-link">프로필</a>
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
              onClick={() => navigate('/login')}
            >
              로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
