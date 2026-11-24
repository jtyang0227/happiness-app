import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
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
import { PrismaService } from './prisma/prisma.service.js';
import { AccountRecoveryController } from './recovery/account-recovery.controller.js';
import { AccountRecoveryService } from './recovery/account-recovery.service.js';

@Module({
  controllers: [HealthController, AuthController, AccountRecoveryController, OAuthController, CommentController, FollowController, BlockController],
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
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
