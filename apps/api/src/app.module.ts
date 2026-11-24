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
import { MemberService } from './member/member.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  controllers: [HealthController, AuthController],
  providers: [
    PrismaService,
    JwtService,
    TokenStore,
    LoginAttemptLimiter,
    AuditService,
    MemberService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
