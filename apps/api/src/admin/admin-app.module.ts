import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoginAttemptLimiter } from '../auth/login-attempt-limiter.js';
import { AdminHelloController } from './admin-hello.controller.js';
import { AdminPrismaService } from './admin-prisma.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminAuthMiddleware } from './auth/admin-auth.middleware.js';
import { AdminJwtService } from './auth/admin-jwt.service.js';
import { AdminExceptionFilter } from './common/admin-exception.filter.js';
import { AdminActivityRecorder } from './common/activity-recorder.js';
import { AdminMemberController } from './member/admin-member.controller.js';
import { AdminMemberService } from './member/admin-member.service.js';
import { MemberSuspensionScheduler } from './member/member-suspension.scheduler.js';
import { AdminPrivacyLogController } from './audit/admin-privacy-log.controller.js';
import { AdminSecurityAuditController } from './audit/admin-security-audit.controller.js';
import { FieldEncryptor } from './privacy/field-encryptor.js';
import { AdminBookingController, AdminGatheringController, AdminInquiryController, AdminNewsletterController, AdminTransactionController, AdminVerificationController } from './ops/admin-business.controllers.js';
import { AdminReportController, ReportAiTriageService } from './ops/admin-report.controller.js';
import { AdminContentPolicyController, AdminStatsController, AdminSystemController } from './ops/admin-stats-system.controllers.js';
import { AdminCategoryController, AdminPhotoController } from './content/admin-photo.controller.js';
import { AdminSeriesController } from './content/admin-series.controller.js';
import { AdminPortfolioController } from './content/admin-portfolio.controller.js';
import { AdminSortController } from './content/admin-sort.controller.js';
import { AdminCommentController } from './content/admin-comment.controller.js';
import { AdminFeaturedController } from './content/admin-featured.controller.js';
import { AdminProfileContentController } from './content/admin-profile-content.controller.js';
import { AdminBannerController, AdminNoticeController, AdminPopupController, PopupApiController } from './content/admin-notice-banner-popup.controllers.js';
import { PrivacyAccessRecorder } from './privacy/privacy-access-recorder.js';
import { AdminTimeController, TimeSyncService } from '../time/time.controller.js';

/**
 * happiness-admin(Spring Boot) 이관 — 앱(AppModule)과 별도 진입점(admin-main.ts).
 * 경로(/api/auth/login, /api/admin/reports 등)·오류 형식·JWT가 앱과 달라 한 프로세스에 섞지 않는다(PLANNING 4-1).
 */
@Module({
  controllers: [AdminHelloController, AdminAuthController, AdminMemberController, AdminPrivacyLogController, AdminSecurityAuditController,
    AdminPhotoController, AdminCategoryController, AdminSeriesController, AdminPortfolioController, AdminSortController, AdminCommentController,
    AdminFeaturedController, AdminProfileContentController, AdminBannerController, AdminPopupController, PopupApiController, AdminNoticeController,
    AdminInquiryController, AdminBookingController, AdminTransactionController, AdminGatheringController, AdminNewsletterController, AdminVerificationController,
    AdminReportController, AdminStatsController, AdminSystemController, AdminContentPolicyController, AdminTimeController],
  providers: [AdminPrismaService, AdminJwtService, LoginAttemptLimiter, FieldEncryptor, PrivacyAccessRecorder, AdminActivityRecorder, AdminMemberService, MemberSuspensionScheduler, ReportAiTriageService, TimeSyncService, { provide: APP_FILTER, useClass: AdminExceptionFilter }],
})
export class AdminAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AdminAuthMiddleware).forRoutes('*');
  }
}
