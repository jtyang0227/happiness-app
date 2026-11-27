import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { xssQueryMiddleware } from './common/xss-query.middleware.js';
import { securityHeaders } from './common/security-headers.js';
import { rateLimitMiddleware } from './common/rate-limit.middleware.js';

async function bootstrap() {
  // DB의 timestamp without time zone을 Spring(LocalDateTime, UTC 서버)과 같은 값으로 읽고 쓰기 위해 UTC로 고정
  process.env.TZ = process.env.TZ ?? 'UTC';
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:19006,http://localhost:8081')
    .split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Spring corsConfigurationSource와 같은 목록 — 예전 '*'는 Fetch 표준상 Authorization을 덮지 못하고(브라우저에 따라
    // preflight 차단), 필요 없는 헤더까지 허용했다
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Trace-Id', 'X-Requested-With', 'Accept', 'X-Device-Id'],
    exposedHeaders: ['X-Trace-Id'],
    credentials: true,
    maxAge: 3600,
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityHeaders());
  app.use(rateLimitMiddleware());
  app.use(xssQueryMiddleware);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 8090);
  await app.listen(port);
  console.log(`happiness-api listening on ${port} (legacy: ${process.env.LEGACY_API_URL ?? 'none'})`);
}
bootstrap();
