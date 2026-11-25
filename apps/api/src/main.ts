import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { xssQueryMiddleware } from './common/xss-query.middleware.js';
import { ipBlock, rateLimit, scannerBlock, securityHeaders } from './common/security.middleware.js';
import { TokenStore } from './auth/token-store.js';

async function bootstrap() {
  // DB의 timestamp without time zone을 Spring(LocalDateTime, UTC 서버)과 같은 값으로 읽고 쓰기 위해 UTC로 고정
  process.env.TZ = process.env.TZ ?? 'UTC';
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:19006,http://localhost:8081')
    .split(',').map((s) => s.trim()).filter(Boolean);
  // Spring SecurityConfig.corsConfigurationSource와 같은 목록
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Trace-Id', 'X-Requested-With', 'Accept', 'X-Device-Id'],
    exposedHeaders: ['X-Trace-Id'],
    credentials: true,
    maxAge: 3600,
  });
  // Spring 보안 필터·헤더(PROMPT_ts-security-parity.md) — 헤더 → IP 차단 → 스캐너 차단 → 전역 속도 제한
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const tokens = app.get(TokenStore);
  app.use(securityHeaders('app'));
  app.use(ipBlock((ip) => tokens.isIpBlocked(ip)));
  app.use(scannerBlock);
  app.use(rateLimit());
  app.use(xssQueryMiddleware);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 8090);
  await app.listen(port);
  console.log(`happiness-api listening on ${port} (legacy: ${process.env.LEGACY_API_URL ?? 'none'})`);
}
bootstrap();
