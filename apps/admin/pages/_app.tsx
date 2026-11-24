import type { AppProps } from 'next/app';
// Next(Pages Router)는 전역 CSS를 _app에서만 불러올 수 있다 — CRA 번들과 같은 순서(index.jsx부터 깊이 우선 import 순서)로 모았다.
// 컴포넌트를 추가하면서 CSS를 새로 만들면 여기에 그 컴포넌트가 처음 import되는 자리에 맞춰 넣는다.
import '../src/components/common/ConfirmDialog.css';
import '../src/components/layout/AdminTopbar.css';
import '../src/components/layout/IconRail.css';
import '../src/components/common/CommandPalette.css';
import '../src/components/layout/AdminLayout.css';
import '../src/pages/LoginPage.css';
import '../src/components/dashboard/ActivityFeed.css';
import '../src/components/dashboard/BookingCalendar.css';
import '../src/components/dashboard/WeeklyBookingList.css';
import '../src/pages/DashboardPage.css';
import '../src/components/common/Pagination.css';
import '../src/components/common/SlideOver.css';
import '../src/components/common/SegmentedControl.css';
import '../src/components/common/ReasonDialog.css';
import '../src/pages/MemberListPage.css';
import '../src/pages/MemberDetailPage.css';
import '../src/pages/PhotoListPage.css';
import '../src/pages/InquiryListPage.css';
import '../src/pages/SeriesListPage.css';
import '../src/pages/PortfolioListPage.css';
import '../src/pages/SortPhotosPage.css';
import '../src/pages/SortSeriesPage.css';
import '../src/pages/SortSeriesDetailPage.css';
import '../src/pages/SortPortfolioPage.css';
import '../src/pages/StatsPage.css';
import '../src/pages/SystemPage.css';
import '../src/pages/CurationPage.css';
import '../src/pages/CommentListPage.css';
import '../src/pages/GatheringListPage.css';
import '../src/pages/SecurityAuditPage.css';
import '../src/pages/ProfileContentPage.css';
import '../src/pages/NewsletterPage.css';
import '../src/pages/TransactionsPage.css';
import '../src/pages/PrivacyLogPage.css';
import '../src/pages/NotFoundPage.css';
import '../src/pages/NoticePage.css';
import '../src/pages/BannerPage.css';
import '../src/pages/ReportListPage.css';
import '../src/pages/VerificationListPage.css';
import '../src/pages/FeaturedPage.css';
import '../src/pages/ContentPolicyPage.css';
import '../src/pages/PopupPage.css';
import '../src/styles/global.css';
import '../src/styles/next-shell.css';

export default function AdminApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
