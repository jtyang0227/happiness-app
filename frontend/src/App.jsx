import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';

import LoginPage    from './pages/LoginPage';
import SignUpPage   from './pages/SignUpPage';
import GalleryPage  from './pages/GalleryPage';
import ExplorePage  from './pages/ExplorePage';
import ListPage     from './pages/ListPage';
import PhotoDetailPage from './pages/PhotoDetailPage';
import PhotoFormPage   from './pages/PhotoFormPage';
import ProfilePage  from './pages/ProfilePage';

// Routes that show the Header (authenticated app shell)
const STANDALONE_PATHS = ['/login', '/signup'];

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppShell() {
  const location = useLocation();
  const isStandalone = STANDALONE_PATHS.includes(location.pathname);

  const isGallery = location.pathname === '/';
  const bg = isStandalone ? '#0a0a1a' : isGallery ? '#111111' : '#f7f7fb';

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      {!isStandalone && <Header />}
      <main style={{ paddingBottom: 40 }}>
        <Routes>
          {/* Standalone (no header, dark theme) */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
