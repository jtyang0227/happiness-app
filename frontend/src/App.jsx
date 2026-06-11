import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';
import useAuthStore from './store/authStore';

import LoginPage    from './pages/LoginPage';
import SignUpPage   from './pages/SignUpPage';
import GalleryPage  from './pages/GalleryPage';
import ExplorePage  from './pages/ExplorePage';
import ListPage     from './pages/ListPage';
import PhotoDetailPage from './pages/PhotoDetailPage';
import PhotoFormPage   from './pages/PhotoFormPage';
import ProfilePage  from './pages/ProfilePage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import PortfolioPage from './pages/PortfolioPage';
import KakaoCallbackPage from './pages/KakaoCallbackPage';

// Routes that show the Header (authenticated app shell)
const STANDALONE_PATHS = ['/login', '/signup', '/oauth/kakao/callback'];

function AppShell() {
  const location = useLocation();
  const isStandalone = STANDALONE_PATHS.includes(location.pathname);

  const isGallery = location.pathname === '/';
  const bg = isStandalone ? '#0a0a1a' : isGallery ? '#111111' : '#f7f7fb';

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      {!isStandalone && <Header />}
      <style>{`
        @media (max-width: 767px) {
          .happiness-main { padding-bottom: calc(60px + env(safe-area-inset-bottom) + 16px) !important; }
        }
      `}</style>
      <main className="happiness-main" style={{ paddingBottom: 40 }}>
        <Routes>
          {/* Standalone (no header, dark theme) */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/oauth/kakao/callback" element={<KakaoCallbackPage />} />

          {/* Public portfolio — no login required */}
          <Route path="/portfolio/:profileName" element={<PortfolioPage />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute><GalleryPage /></ProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute><ExplorePage /></ProtectedRoute>
          } />
          <Route path="/list" element={
            <ProtectedRoute><ListPage /></ProtectedRoute>
          } />
          <Route path="/photo/new" element={
            <ProtectedRoute><PhotoFormPage /></ProtectedRoute>
          } />
          <Route path="/photo/:id" element={
            <ProtectedRoute><PhotoDetailPage /></ProtectedRoute>
          } />
          <Route path="/photo/:id/edit" element={
            <ProtectedRoute><PhotoFormPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
