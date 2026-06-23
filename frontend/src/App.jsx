import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';
import useAuthStore from './store/authStore';
import { BG, AMBIENT_ORBS, GLASS_CSS } from './constants/glass';

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
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import NaverCallbackPage from './pages/NaverCallbackPage';
import AppleResultPage from './pages/AppleResultPage';
import SeriesPage from './pages/SeriesPage';
import InquiryFormPage from './pages/InquiryFormPage';
import InquiryInboxPage from './pages/InquiryInboxPage';
import FeedPage from './pages/FeedPage';
import ImageEditorPage from './pages/ImageEditorPage';
import PortfolioSlideshowPage from './pages/PortfolioSlideshowPage';
import AdminDashboardPage    from './pages/admin/AdminDashboardPage';
import AdminGalleryOrderPage from './pages/admin/AdminGalleryOrderPage';
import AdminMembersPage      from './pages/admin/AdminMembersPage';
import AdminPhotosPage       from './pages/admin/AdminPhotosPage';
import AdminCategoryPage     from './pages/admin/AdminCategoryPage';
import ClientDeliveryPage    from './pages/ClientDeliveryPage';
import DeliveriesPage        from './pages/DeliveriesPage';
import BookingPage           from './pages/BookingPage';
import BookingDashboard      from './pages/BookingDashboard';

const DARK_PATHS = ['/login', '/signup'];
const STANDALONE_PATHS = [
  ...DARK_PATHS,
  '/oauth/kakao/callback',
  '/oauth/google/callback',
  '/oauth/naver/callback',
  '/oauth/apple/result',
  '/editor',
];

function AppShell() {
  const location = useLocation();
  const isDark       = DARK_PATHS.includes(location.pathname);
  const isGallery    = location.pathname === '/';
  const isStandalone = STANDALONE_PATHS.includes(location.pathname)
    || location.pathname.startsWith('/inquiry/')
    || location.pathname.startsWith('/proof/')
    || location.pathname.startsWith('/booking/')
    || location.pathname.startsWith('/admin')
    || /^\/portfolio\/[^/]+\/slideshow$/.test(location.pathname);

  // Background: dark aurora for login/signup, gallery bg for gallery, default (CSS) for rest
  const bg = isDark ? BG.dark : isGallery ? BG.gallery : undefined;

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      position: 'relative',
      overflow: isDark ? 'hidden' : undefined,
    }}>
      <style>{GLASS_CSS}{`
        @media (max-width: 767px) {
          .happiness-main { padding-bottom: calc(60px + env(safe-area-inset-bottom) + 16px) !important; }
        }
      `}</style>

      {/* Animated ambient orbs — only on dark aurora pages */}
      {isDark && AMBIENT_ORBS.map((orb, i) => (
        <div key={i} style={orb.style} />
      ))}

      {!isStandalone && <Header />}
      <main className="happiness-main" style={{ paddingBottom: 40 }}>
        <Routes>
          {/* Standalone */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/oauth/kakao/callback"  element={<KakaoCallbackPage />} />
          <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/oauth/naver/callback"  element={<NaverCallbackPage />} />
          <Route path="/oauth/apple/result"    element={<AppleResultPage />} />

          {/* Public */}
          <Route path="/portfolio/:profileName" element={<PortfolioPage />} />
          <Route path="/portfolio/:profileName/slideshow" element={<PortfolioSlideshowPage />} />
          <Route path="/inquiry/:profileName" element={<InquiryFormPage />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
          <Route path="/list" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
          <Route path="/photo/new" element={<ProtectedRoute><PhotoFormPage /></ProtectedRoute>} />
          <Route path="/photo/:id" element={<ProtectedRoute><PhotoDetailPage /></ProtectedRoute>} />
          <Route path="/photo/:id/edit" element={<ProtectedRoute><PhotoFormPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/series" element={<ProtectedRoute><SeriesPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InquiryInboxPage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />

          {/* Delivery & Booking (standalone) */}
          <Route path="/proof/:token" element={<ClientDeliveryPage />} />
          <Route path="/booking/:profileName" element={<BookingPage />} />

          {/* Delivery & Booking (protected) */}
          <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingDashboard /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/gallery-order" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminGalleryOrderPage /></ProtectedRoute>} />
          <Route path="/admin/members" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminMembersPage /></ProtectedRoute>} />
          <Route path="/admin/photos" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminPhotosPage /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminCategoryPage /></ProtectedRoute>} />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
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
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
