import type { Request, RequestHandler, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { restoreRawUrl } from './xss-query.middleware.js';

/**
 * 아직 옮기지 않은 경로는 기존 Spring API로 그대로 넘긴다 (strangler 방식, PLANNING_typescript-migration.md 2-1).
 * LEGACY_API_URL이 없으면 null → 그냥 404.
 */
let proxy: RequestHandler | null | undefined;

export function legacyProxy(): RequestHandler | null {
  if (proxy !== undefined) return proxy;
  const target = process.env.LEGACY_API_URL;
  proxy = target
    ? createProxyMiddleware({
        target,
        changeOrigin: true,
        xfwd: true,
        // Nest가 이미 JSON·폼 본문을 읽었으므로 다시 실어 보낸다 (multipart는 읽지 않아 그대로 흐른다)
        on: { proxyReq: fixRequestBody },
      })
    : null;
  return proxy;
}

export function forwardToLegacy(req: Request, res: Response): boolean {
  const p = legacyProxy();
  if (!p) return false;
  restoreRawUrl(req);
  p(req, res, () => undefined);
  return true;
}
