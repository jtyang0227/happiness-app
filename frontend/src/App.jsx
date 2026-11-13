import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ChatWidget from './components/assistant/ChatWidget';
import useAuthStore from './store/authStore';
import { GLOBAL_KEYFRAMES } from './constants/animations';
import { trackPageView } from './utils/analytics';

import LoginPage from './pages/LoginPage';
import ExplorePage from './pages/ExplorePage';

// 배포 직후 열려 있던 탭은 지워진 옛 chunk를 요청해 실패한다 — 한 번만 새로고침해 새 index.html을 받는다.
function lazyPage(load) {
  return lazy(() => load().then(
    (mod) => { try { sessionStorage.removeItem('chunk_reloaded'); } catch (_) {} return mod; },
    (err) => {
      let reloaded = true;
      try { reloaded = sessionStorage.getItem('chunk_reloaded') === '1'; sessionStorage.setItem('chunk_reloaded', '1'); } catch (_) {}
      if (!reloaded) { window.location.reload(); return new Promise(() => {}); }
      throw err;
    },
  ));
}

// 첫 화면(둘러보기·로그인)만 바로 싣고, 나머지 화면은 들어갈 때 내려받는다 — 에디터·어드민·분석 차트가 첫 로딩에 실리지 않게.
const SignUpPage = lazyPage(() => import('./pages/SignUpPage'));
const FindAccountPage = lazyPage(() => import('./pages/FindAccountPage'));
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'));
const PhotoDetailPage = lazyPage(() => import('./pages/PhotoDetailPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const UnauthorizedPage = lazyPage(() => import('./pages/UnauthorizedPage'));
const PortfolioPage = lazyPage(() => import('./pages/PortfolioPage'));
const KakaoCallbackPage = lazyPage(() => import('./pages/KakaoCallbackPage'));
const GoogleCallbackPage = lazyPage(() => import('./pages/GoogleCallbackPage'));
const NaverCallbackPage = lazyPage(() => import('./pages/NaverCallbackPage'));
const AppleResultPage = lazyPage(() => import('./pages/AppleResultPage'));
const SeriesPage = lazyPage(() => import('./pages/SeriesPage'));
const InquiryFormPage = lazyPage(() => import('./pages/InquiryFormPage'));
const InquiryInboxPage = lazyPage(() => import('./pages/InquiryInboxPage'));
const FeedPage = lazyPage(() => import('./pages/FeedPage'));
const ImageEditorPage = lazyPage(() => import('./pages/ImageEditorPage'));
const PortfolioSlideshowPage = lazyPage(() => import('./pages/PortfolioSlideshowPage'));
const WorkCasePage = lazyPage(() => import('./pages/WorkCasePage'));
const AdminDashboardPage = lazyPage(() => import('./pages/admin/AdminDashboardPage'));
const AdminGalleryOrderPage = lazyPage(() => import('./pages/admin/AdminGalleryOrderPage'));
const AdminMembersPage = lazyPage(() => import('./pages/admin/AdminMembersPage'));
const AdminPhotosPage = lazyPage(() => import('./pages/admin/AdminPhotosPage'));
const AdminCategoryPage = lazyPage(() => import('./pages/admin/AdminCategoryPage'));
const AdminTagsPage = lazyPage(() => import('./pages/admin/AdminTagsPage'));
const AdminModerationPage = lazyPage(() => import('./pages/admin/AdminModerationPage'));
const AdminCurationPage = lazyPage(() => import('./pages/admin/AdminCurationPage'));
const ClientDeliveryPage = lazyPage(() => import('./pages/ClientDeliveryPage'));
const DeliveriesPage = lazyPage(() => import('./pages/DeliveriesPage'));
const BookingPage = lazyPage(() => import('./pages/BookingPage'));
const BookingDashboard = lazyPage(() => import('./pages/BookingDashboard'));
const MeetsPage = lazyPage(() => import('./pages/MeetsPage'));
const MeetDetailPage = lazyPage(() => import('./pages/MeetDetailPage'));
const MyReportsPage = lazyPage(() => import('./pages/MyReportsPage'));
const GatheringsPage = lazyPage(() => import('./pages/GatheringsPage'));
const GatheringFormPage = lazyPage(() => import('./pages/GatheringFormPage'));
const GatheringDetailPage = lazyPage(() => import('./pages/GatheringDetailPage'));
const GatheringManagePage = lazyPage(() => import('./pages/GatheringManagePage'));
const GatheringAlbumPage = lazyPage(() => import('./pages/GatheringAlbumPage'));
const GatheringCalendarPage = lazyPage(() => import('./pages/GatheringCalendarPage'));
const IntegratedCalendarPage = lazyPage(() => import('./pages/IntegratedCalendarPage'));
const GatheringNotificationsPage = lazyPage(() => import('./pages/GatheringNotificationsPage'));
const MoodboardPage = lazyPage(() => import('./pages/MoodboardPage'));
const SharedBoardPage = lazyPage(() => import('./pages/SharedBoardPage'));
const WorkspacePage = lazyPage(() => import('./pages/WorkspacePage'));
const PortfolioBuilderPage = lazyPage(() => import('./pages/PortfolioBuilderPage'));

const DARK_PATHS = ['/login', '/signup'];
const STANDALONE_PATHS = [
  ...DARK_PATHS,
  '/find-account',
  '/reset-password',
  '/oauth/kakao/callback',
  '/oauth/google/callback',
  '/oauth/naver/callback',
  '/oauth/apple/result',
  '/editor',
  '/photo/new',
  '/portfolio-builder',
];

// 화면 코드를 내려받는 동안 — 0.2초 안에 끝나면 아무것도 보이지 않게 늦게 나타난다
function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="route-fallback">
      <span className="route-fallback-spinner" aria-hidden="true" />
      <span className="sr-only">화면을 불러오는 중</span>
    </div>
  );
}

function AppShell() {
  const location = useLocation();

  // Firebase Analytics 페이지 조회 — 경로만(쿼리 제외, 비밀 토큰 경로는 가림)
  useEffect(() => { trackPageView(location.pathname); }, [location.pathname]);
  const isStandalone = STANDALONE_PATHS.includes(location.pathname)
    || location.pathname.startsWith('/inquiry/')
    || location.pathname.startsWith('/proof/')
    || location.pathname.startsWith('/b/')
    || location.pathname.startsWith('/booking/')
    || location.pathname.startsWith('/admin')
    || /^\/portfolio\/[^/]+\/slideshow$/.test(location.pathname)
    || /^\/portfolio\/[^/]+\/work\/[^/]+$/.test(location.pathname)
    || /^\/photo\/\d+\/edit$/.test(location.pathname);

  // Toss 플랫 디자인 — 로그인/회원가입 포함 전 화면 동일한 화이트 배경
  const bg = '#ffffff';

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      position: 'relative',
    }}>
      <style>{GLOBAL_KEYFRAMES}{`
        @media (max-width: 767px) {
          .happiness-main { padding-bottom: calc(60px + env(safe-area-inset-bottom) + 16px) !important; }
        }
      `}</style>

      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      {!isStandalone && <Header />}
      {!isStandalone && <ChatWidget />}
      <main id="main-content" tabIndex={-1} className="happiness-main" style={{ paddingBottom: 40, outline: 'none' }}>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Standalone */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/find-account"   element={<FindAccountPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/oauth/kakao/callback"  element={<KakaoCallbackPage />} />
          <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/oauth/naver/callback"  element={<NaverCallbackPage />} />
          <Route path="/oauth/apple/result"    element={<AppleResultPage />} />

          {/* Public */}
          <Route path="/portfolio/:profileName" element={<PortfolioPage />} />
          <Route path="/portfolio/:profileName/slideshow" element={<PortfolioSlideshowPage />} />
          <Route path="/portfolio/:profileName/work/:seriesId" element={<WorkCasePage />} />
          <Route path="/inquiry/:profileName" element={<InquiryFormPage />} />
          {/* 탐색 — 의뢰인이 로그인 없이 작가·작업을 찾을 수 있게 공개 (PLANNING_work-discovery.md) */}
          <Route path="/explore" element={<ExplorePage />} />

          {/* Protected */}
          {/* 예전 갤러리(/)·목록(/list)은 탐색 사진 탭으로 합쳤다 — 북마크·외부 링크 보존용 리다이렉트 */}
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="/list" element={<Navigate to="/explore" replace />} />
          <Route path="/photo/new" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />
          <Route path="/photo/:id" element={<ProtectedRoute><PhotoDetailPage /></ProtectedRoute>} />
          <Route path="/photo/:id/edit" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/series" element={<ProtectedRoute><SeriesPage /></ProtectedRoute>} />
          <Route path="/portfolio-builder" element={<ProtectedRoute><PortfolioBuilderPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InquiryInboxPage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/boards/:id" element={<ProtectedRoute><MoodboardPage /></ProtectedRoute>} />
          <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute><ImageEditorPage /></ProtectedRoute>} />

          {/* Delivery & Booking (standalone) */}
          <Route path="/proof/:token" element={<ClientDeliveryPage />} />
          <Route path="/b/:token" element={<SharedBoardPage />} />
          <Route path="/booking/:profileName" element={<BookingPage />} />

          {/* Delivery & Booking (protected) */}
          <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingDashboard /></ProtectedRoute>} />

          {/* Integrated calendar (Feature 39) */}
          <Route path="/calendar" element={<ProtectedRoute><IntegratedCalendarPage /></ProtectedRoute>} />

          {/* Meets */}
          <Route path="/meets" element={<ProtectedRoute><MeetsPage /></ProtectedRoute>} />
          <Route path="/meets/:id" element={<ProtectedRoute><MeetDetailPage /></ProtectedRoute>} />

          {/* Reports */}
          <Route path="/reports/mine" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />

          {/* Gatherings — list/detail/album public; new/edit/manage/notifications require auth */}
          <Route path="/gatherings" element={<GatheringsPage />} />
          <Route path="/gatherings/notifications" element={<ProtectedRoute><GatheringNotificationsPage /></ProtectedRoute>} />
          <Route path="/gatherings/new" element={<ProtectedRoute><GatheringFormPage /></ProtectedRoute>} />
          <Route path="/gatherings/:id" element={<GatheringDetailPage />} />
          <Route path="/gatherings/:id/edit" element={<ProtectedRoute><GatheringFormPage /></ProtectedRoute>} />
          <Route path="/gatherings/:id/manage" element={<ProtectedRoute><GatheringManagePage /></ProtectedRoute>} />
          <Route path="/gatherings/:id/album" element={<GatheringAlbumPage />} />
          <Route path="/gatherings/calendar" element={<ProtectedRoute><GatheringCalendarPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/gallery-order" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminGalleryOrderPage /></ProtectedRoute>} />
          <Route path="/admin/members" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminMembersPage /></ProtectedRoute>} />
          <Route path="/admin/photos" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminPhotosPage /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminCategoryPage /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminTagsPage /></ProtectedRoute>} />
          <Route path="/admin/moderation" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminModerationPage /></ProtectedRoute>} />
          <Route path="/admin/curation" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminCurationPage /></ProtectedRoute>} />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
        </Suspense>
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
