import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoginAttemptLimiter } from '../auth/login-attempt-limiter.js';
import { AdminHelloController } from './admin-hello.controller.js';
import { AdminPrismaService } from './admin-prisma.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminAuthMiddleware } from './auth/admin-auth.middleware.js';
import { AdminJwtService } from './auth/admin-jwt.service.js';
import { AdminExceptionFilter } from './common/admin-exception.filter.js';

/**
 * happiness-admin(Spring Boot) 이관 — 앱(AppModule)과 별도 진입점(admin-main.ts).
 * 경로(/api/auth/login, /api/admin/reports 등)·오류 형식·JWT가 앱과 달라 한 프로세스에 섞지 않는다(PLANNING 4-1).
 */
@Module({
  controllers: [AdminHelloController, AdminAuthController],
  providers: [AdminPrismaService, AdminJwtService, LoginAttemptLimiter, { provide: APP_FILTER, useClass: AdminExceptionFilter }],
})
export class AdminAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AdminAuthMiddleware).forRoutes('*');
  }
}
