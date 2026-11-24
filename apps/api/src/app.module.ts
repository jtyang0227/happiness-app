import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit/audit.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { JwtService } from './auth/jwt.service.js';
import { LoginAttemptLimiter } from './auth/login-attempt-limiter.js';
import { TokenStore } from './auth/token-store.js';
import { AllExceptionsFilter } from './common/exception.filter.js';
import { HealthController } from './health.controller.js';
import { MailService } from './mail/mail.service.js';
import { MemberService } from './member/member.service.js';
import { OAuthController } from './oauth/oauth.controller.js';
import { OAuthService } from './oauth/oauth.service.js';
import { BlockController } from './block/block.controller.js';
import { CommentController } from './comment/comment.controller.js';
import { CommentService } from './comment/comment.service.js';
import { FollowController } from './follow/follow.controller.js';
import { FollowService } from './follow/follow.service.js';
import { AdminAuditInterceptor } from './common/admin-audit.interceptor.js';
import { ReportController } from './report/report.controller.js';
import { ReportService } from './report/report.service.js';
import { PhotoController } from './photo/photo.controller.js';
import { AutoTagService } from './photo/auto-tag.service.js';
import { PhotoCommandService } from './photo/photo-command.service.js';
import { PhotoQueryService } from './photo/photo-query.service.js';
import { FeedController } from './feed/feed.controller.js';
import { StorageController } from './storage/storage.controller.js';
import { StorageService } from './storage/storage.service.js';
import { BookingController } from './booking/booking.controller.js';
import { BookingService } from './booking/booking.service.js';
import { DeliveryController } from './delivery/delivery.controller.js';
import { MeetController } from './meet/meet.controller.js';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { InquiryController } from './inquiry/inquiry.controller.js';
import { PortfolioController } from './portfolio/portfolio.controller.js';
import { MoodboardController } from './moodboard/moodboard.controller.js';
import { AdminSeriesController, SeriesController } from './series/series.controller.js';
import { SeriesService } from './series/series.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AccountRecoveryController } from './recovery/account-recovery.controller.js';
import { AccountRecoveryService } from './recovery/account-recovery.service.js';

@Module({
  controllers: [HealthController, AuthController, AccountRecoveryController, OAuthController, CommentController, FollowController, BlockController, ReportController, PhotoController, FeedController, StorageController, MoodboardController, SeriesController, AdminSeriesController, PortfolioController, InquiryController, BookingController, DeliveryController, MeetController, AnalyticsController],
  providers: [
    PrismaService,
    JwtService,
    TokenStore,
    LoginAttemptLimiter,
    AuditService,
    MemberService,
    AuthService,
    MailService,
    AccountRecoveryService,
    OAuthService,
    CommentService,
    FollowService,
    ReportService,
    PhotoQueryService,
    PhotoCommandService,
    StorageService,
    AutoTagService,
    SeriesService,
    BookingService,
    { provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
