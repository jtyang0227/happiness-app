import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AdminAppModule } from './admin/admin-app.module.js';
import { captureRoutes } from './admin/common/admin-routes.js';

/**
 * 어드민 API 진입점 — happiness-admin backend(Spring Boot, 8081)를 대체한다. 앱 API(main.ts)와 별도 프로세스·포트.
 * 실행: node dist/admin-main.js (ADMIN_PORT 기본 8091)
 */

/** Spring setAllowedOriginPatterns — `*`는 아무 문자열 */
function originMatcher(patterns: string[]) {
  const res = patterns.map((p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
  return (origin: string) => res.some((r) => r.test(origin));
}

/** SecurityConfig.corsConfigurationSource — 허용 메서드·헤더 고정, 쿠키 자격증명 없음. 허용 안 된 Origin은 403 "Invalid CORS request" */
function cors(allowed: (o: string) => boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const self = `${req.protocol}://${req.headers.host}`;
    if (!origin || origin === self) return next();
    res.vary('Origin');
    res.vary('Access-Control-Request-Method');
    res.vary('Access-Control-Request-Headers');
    const preflight = req.method === 'OPTIONS' && req.headers['access-control-request-method'];
    if (!allowed(origin)) {
      res.status(403).send('Invalid CORS request');
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (preflight) {
      const method = String(req.headers['access-control-request-method']).toUpperCase();
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
      const reqHeaders = String(req.headers['access-control-request-headers'] ?? '')
        .split(',').map((h) => h.trim()).filter(Boolean);
      const okHeaders = reqHeaders.every((h) => ['authorization', 'content-type'].includes(h.toLowerCase()));
      if (!methods.includes(method) || !okHeaders) {
        res.status(403).send('Invalid CORS request');
        return;
      }
      res.setHeader('Access-Control-Allow-Methods', methods.join(','));
      if (reqHeaders.length) res.setHeader('Access-Control-Allow-Headers', reqHeaders.join(', '));
      res.status(200).end();
      return;
    }
    next();
  };
}

async function bootstrap() {
  process.env.TZ = process.env.TZ ?? 'UTC';
  const app = await NestFactory.create(AdminAppModule, { logger: ['log', 'warn', 'error'], cors: false });
  // Spring 어드민 prod 기본값은 '*'(경고 로그) — 운영에서는 어드민 프론트 도메인만
  const patterns = (process.env.ADMIN_CORS_ALLOWED_ORIGINS ?? 'http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean);
  if (patterns.includes('*')) console.warn("[SECURITY] ADMIN_CORS_ALLOWED_ORIGINS='*' — 운영에서는 어드민 프론트 도메인만 지정하세요.");
  app.use(cors(originMatcher(patterns)));
  app.enableShutdownHooks();
  await app.init();
  captureRoutes(app.getHttpAdapter().getInstance());
  const port = Number(process.env.ADMIN_PORT ?? 8091);
  await app.listen(port);
  console.log(`happiness-admin-api listening on ${port} (schema: ${process.env.ADMIN_DB_SCHEMA ?? 'admin'})`);
}
bootstrap();
